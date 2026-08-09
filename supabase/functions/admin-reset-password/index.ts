import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method tidak diizinkan" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Tidak ada token otorisasi" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client ini berjalan ATAS NAMA pemanggil (pakai anon key + token JWT-nya)
    // supaya tunduk pada RLS -> dipakai untuk verifikasi identitas & role admin.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Token tidak valid atau sudah kedaluwarsa" }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("users_profile")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Akses ditolak. Hanya admin yang boleh reset password pengguna." }, 403);
    }

    const body = await req.json().catch(() => null);
    const user_id = body?.user_id;
    const new_password = body?.new_password;

    if (!user_id || typeof new_password !== "string") {
      return json({ error: "user_id dan new_password wajib diisi" }, 400);
    }

    if (new_password.length < 6) {
      return json({ error: "Password minimal 6 karakter" }, 400);
    }

    // Client ini pakai service_role key -> HANYA dipakai di server (Edge Function),
    // TIDAK PERNAH dikirim ke browser. Ini yang berwenang ubah password user manapun.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ success: true, message: "Password berhasil diubah" });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Terjadi kesalahan server" }, 500);
  }
});
