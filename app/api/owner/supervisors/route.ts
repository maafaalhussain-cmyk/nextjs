import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PermissionSet = {
  manage_products: boolean;
  view_orders: boolean;
  view_finance: boolean;
  manage_sellers: boolean;
};

const permissionKeys: (keyof PermissionSet)[] = [
  "manage_products", "view_orders", "view_finance", "manage_sellers",
];
const noPermissions = (): PermissionSet => ({
  manage_products: false, view_orders: false, view_finance: false, manage_sellers: false,
});

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !serviceKey) return null;
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function ownerContext(request: Request) {
  const cs = clients();
  if (!cs) return { response: NextResponse.json({ error: "إعدادات Supabase الخادمية غير مكتملة. أضف SUPABASE_SERVICE_ROLE_KEY في بيئة الخادم." }, { status: 503 }) };
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { response: NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 }) };
  const { data: { user }, error: authError } = await cs.auth.auth.getUser(token);
  if (authError || !user) return { response: NextResponse.json({ error: "جلسة الدخول غير صالحة." }, { status: 401 }) };
  const { data: role, error: roleError } = await cs.admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError) return { response: NextResponse.json({ error: "تعذر التحقق من صلاحيات المالك. تأكد من تطبيق ترحيل 0009." }, { status: 503 }) };
  if (role?.role !== "owner") return { response: NextResponse.json({ error: "هذه العملية متاحة لمالك السوق فقط." }, { status: 403 }) };
  return { clients: cs, user };
}

function readPermissions(input: unknown): PermissionSet | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const result = noPermissions();
  for (const key of permissionKeys) {
    if (typeof source[key] !== "boolean") return null;
    result[key] = source[key] as boolean;
  }
  return result;
}

export async function GET(request: Request) {
  const context = await ownerContext(request);
  if ("response" in context) return context.response;
  const { admin } = context.clients;
  const { data: roleRows, error: rolesError } = await admin.from("user_roles").select("user_id,role").eq("role", "supervisor");
  if (rolesError) return NextResponse.json({ error: rolesError.message }, { status: 500 });
  const ids = (roleRows || []).map(row => row.user_id);
  if (!ids.length) return NextResponse.json({ supervisors: [] });
  const [{ data: permissionRows, error: permissionsError }, { data: usersData, error: usersError }] = await Promise.all([
    admin.from("supervisor_permissions").select("user_id,manage_products,view_orders,view_finance,manage_sellers").in("user_id", ids),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (permissionsError) return NextResponse.json({ error: permissionsError.message }, { status: 500 });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
  const users = usersData?.users || [];
  const permissions = permissionRows || [];
  const supervisors = (roleRows || []).map(row => {
    const user = users.find(candidate => candidate.id === row.user_id);
    const permission = permissions.find(candidate => candidate.user_id === row.user_id);
    return {
      userId: row.user_id,
      email: user?.email || "",
      fullName: String(user?.user_metadata?.full_name || ""),
      permissions: permission ? {
        manage_products: permission.manage_products,
        view_orders: permission.view_orders,
        view_finance: permission.view_finance,
        manage_sellers: permission.manage_sellers,
      } : noPermissions(),
    };
  });
  return NextResponse.json({ supervisors });
}

export async function POST(request: Request) {
  const context = await ownerContext(request);
  if ("response" in context) return context.response;
  const { admin } = context.clients;
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "البيانات المرسلة غير صالحة." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const permissions = readPermissions(body.permissions);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || fullName.length > 100 || !permissions) {
    return NextResponse.json({ error: "أدخل اسماً وبريداً صحيحين وحدد كل الصلاحيات." }, { status: 400 });
  }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message || "تعذر إرسال الدعوة. تحقق من إعداد البريد أو ما إذا كان الحساب موجوداً." }, { status: 400 });
  }
  const userId = invited.user.id;
  const { error: roleError } = await admin.from("user_roles").upsert({ user_id: userId, role: "supervisor", updated_at: new Date().toISOString() });
  if (roleError) return NextResponse.json({ error: "تم إنشاء الدعوة لكن تعذر تعيين دور المشرف: " + roleError.message }, { status: 500 });
  const { error: permissionError } = await admin.from("supervisor_permissions").upsert({ user_id: userId, ...permissions, updated_at: new Date().toISOString() });
  if (permissionError) return NextResponse.json({ error: "تم تعيين الدور لكن تعذر حفظ الصلاحيات: " + permissionError.message }, { status: 500 });
  return NextResponse.json({ message: "أُرسلت دعوة المشرف وحُفظت صلاحياته.", userId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await ownerContext(request);
  if ("response" in context) return context.response;
  const { admin } = context.clients;
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "البيانات المرسلة غير صالحة." }, { status: 400 }); }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const permissions = readPermissions(body.permissions);
  if (!userId || !permissions) return NextResponse.json({ error: "معرّف المشرف أو الصلاحيات غير صالحة." }, { status: 400 });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (role?.role !== "supervisor") return NextResponse.json({ error: "الحساب المحدد ليس مشرفاً." }, { status: 404 });
  const { error } = await admin.from("supervisor_permissions").upsert({ user_id: userId, ...permissions, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "تم تحديث الصلاحيات." });
}

export async function DELETE(request: Request) {
  const context = await ownerContext(request);
  if ("response" in context) return context.response;
  const { admin } = context.clients;
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "البيانات المرسلة غير صالحة." }, { status: 400 }); }
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId || userId === context.user.id) return NextResponse.json({ error: "لا يمكن إلغاء هذا الحساب." }, { status: 400 });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (role?.role !== "supervisor") return NextResponse.json({ error: "الحساب المحدد ليس مشرفاً." }, { status: 404 });
  const { error: permissionError } = await admin.from("supervisor_permissions").delete().eq("user_id", userId);
  if (permissionError) return NextResponse.json({ error: permissionError.message }, { status: 500 });
  const { error: roleError } = await admin.from("user_roles").update({ role: "customer", updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
  return NextResponse.json({ message: "تم إلغاء صلاحيات المشرف. لم يتم حذف حسابه." });
}
