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

// Dipakai dua arah:
//  - Member menghapus akun sendiri  -> body kosong / user_id = id sendiri
//  - Admin menghapus akun pengguna  -> body { user_id: "<id target>" }
// Akun ber-role admin tidak bisa dihapus lewat fungsi ini (cabut akses admin dulu).
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

    // Berjalan atas nama pemanggil (tunduk pada RLS) untuk verifikasi identitas.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: "Token tidak valid atau sudah kedaluwarsa" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const targetId: string =
      typeof body?.user_id === "string" && body.user_id ? body.user_id : caller.id;
    const isSelf = targetId === caller.id;

    // service_role hanya dipakai di server, tidak pernah dikirim ke browser.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (!isSelf) {
      const { data: callerProfile } = await adminClient
        .from("users_profile")
        .select("role")
        .eq("id", caller.id)
        .maybeSingle();
      if (!callerProfile || callerProfile.role !== "admin") {
        return json({ error: "Akses ditolak. Hanya admin yang boleh menghapus akun pengguna lain." }, 403);
      }
    }

    const { data: target } = await adminClient
      .from("users_profile")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    if (target && target.role === "admin") {
      return json({
        error: isSelf
          ? "Akun admin tidak bisa dihapus sendiri. Minta admin lain mencabut akses admin dulu."
          : "Akun admin tidak bisa dihapus. Cabut akses admin dulu lewat tombol Detail.",
      }, 403);
    }

    // Hapus baris profil dulu (kalau FK ke auth.users tidak cascade, hapus user akan gagal).
    if (target) {
      const { error: pErr } = await adminClient.from("users_profile").delete().eq("id", targetId);
      if (pErr) return json({ error: "Gagal menghapus profil: " + pErr.message }, 400);
    }

    const { error: delError } = await adminClient.auth.admin.deleteUser(targetId);
    if (delError) {
      // Kembalikan profil supaya data tidak setengah terhapus.
      if (target) await adminClient.from("users_profile").insert([target]);
      return json({ error: delError.message }, 400);
    }

    return json({ success: true, message: "Akun berhasil dihapus" });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Terjadi kesalahan server" }, 500);
  }
});
