async function register() {

    const username =
        document.getElementById("username").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message = document.getElementById("message");

    message.textContent = "";
    message.style.color = "red";

    if (!username || !email || !password) {
        message.textContent = "Lengkapi semua data.";
        return;
    }

    // 🔥 cek username sudah ada
    const { data: existing, error: checkError } = await supabaseClient
        .from("users_profile")
        .select("username")
        .eq("username", username);

    if (checkError) {
        message.textContent = "Terjadi kesalahan cek data.";
        return;
    }

    if (existing && existing.length > 0) {
        message.textContent = "Username sudah digunakan!";
        return;
    }

    // 🔥 register ke Supabase Auth
    const { data: signUpData, error } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {
        message.textContent = error.message;
        return;
    }

    const userId = signUpData.user.id;

    // 🔥 simpan ke profile (TIDAK pakai email karena tidak ada kolomnya)
    const { error: profileError } =
        await supabaseClient
            .from("users_profile")
            .insert([
                {
                    id: userId,
                    username: username,
                    role: "user"
                }
            ]);

    if (profileError) {
        message.textContent = profileError.message;
        return;
    }

    message.style.color = "green";
    message.textContent = "Registrasi berhasil!";

    setTimeout(() => {
        window.location.href = "login.html";
    }, 1000);
}


// =======================================================
// LOGIN
// =======================================================

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message = document.getElementById("message");

    message.textContent = "";
    message.style.color = "red";

    if (!email || !password) {
        message.textContent = "Lengkapi semua data.";
        return;
    }

    // 🔥 login ke Supabase Auth
    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        message.textContent = error.message;
        return;
    }

    const userId = data.user.id;

    // 🔥 ambil profile user
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("users_profile")
            .select("username, role")
            .eq("id", userId)
            .single();

    if (profileError || !profile) {
        message.textContent = "Gagal mengambil data user.";
        return;
    }

    message.style.color = "green";
    message.textContent = "Login berhasil!";

    setTimeout(() => {

        // 🔥 routing berdasarkan role
        if (profile.role === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "dashboard.html";
        }

    }, 1000);
}