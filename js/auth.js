async function register() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    if (!username || !email || !password) {
        message.style.color = "#ef4444";
        message.textContent = "Semua kolom wajib diisi!";
        return;
    }

    message.style.color = "#facc15";
    message.textContent = "Sedang mendaftarkan...";

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                role: "Member" // Menambahkan default role otomatis ke metadata user
            }
        }
    });

    if (error) {
        message.style.color = "#ef4444";
        message.textContent = error.message;
        return;
    }

    message.style.color = "#22c55e";
    message.textContent = "Registrasi berhasil! Silakan coba login.";
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    // Reset status pesan
    messageElement.style.color = "white";
    messageElement.innerText = "Sedang memproses...";

    try {
        // 1. Proses Sign In ke Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. Ambil data role dari tabel users_profile menggunakan ID user yang baru login
            const { data: profile, error: profileError } = await supabaseClient
                .from('users_profile')
                .select('role')
                .eq('id', authData.user.id) // sesuaikan nama kolom id jika di database Anda berbeda (misal: 'user_id')
                .single();

            if (profileError) {
                throw new Error("Gagal memuat profil pengguna: " + profileError.message);
            }

            messageElement.style.color = "#22c55e"; // warna hijau sukses
            messageElement.innerText = "Login berhasil! Mengalihkan...";

            // 3. Pengalihan halaman sesuai data dari tabel
            if (profile && profile.role === "admin") {
                window.location.replace("admin.html");
            } else {
                window.location.replace("dashboard.html");
            }
        }
    } catch (error) {
        console.error(error);
        messageElement.style.color = "#ef4444"; // warna merah error
        messageElement.innerText = error.message || "Terjadi kesalahan saat login.";
    }
}
