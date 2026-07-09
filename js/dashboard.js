document.addEventListener("DOMContentLoaded", () => {
    checkUser();
    loadServerStatus();
    initChart();
    loadAnnouncements(); // Menjalankan fungsi muat pengumuman saat halaman siap
});

// ======================
// CEK USER LOGIN
// ======================
async function checkUser() {
    if (typeof supabaseClient === 'undefined') {
        console.error("Supabase client belum dimuat dengan benar.");
        return;
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Auth error:", error);
        return;
    }

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Jalankan pengambilan profil
    loadProfile(user.id, user.email);
}

// ======================
// LOAD PROFILE USER
// ======================
async function loadProfile(userId, userEmail) {
    const backupUsername = userEmail ? userEmail.split('@')[0] : "User";
    
    let finalUsername = backupUsername;
    let finalRole = "Member";
    let finalCreatedAt = "-";

    try {
        const { data, error } = await supabaseClient
            .from("users_profile")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.error("Profile query error:", error);
        }

        if (data) {
            finalUsername = data.username || backupUsername;
            finalRole = data.role || "Member";
            finalCreatedAt = data.created_at ? new Date(data.created_at).toLocaleDateString("id-ID") : "-";
        }
    } catch (err) {
        console.error("Sistem menangkap error pada loadProfile:", err);
    }

    // Amankan pengisian elemen profil (Meski dalam kondisi display: none)
    setTimeout(() => {
        if (document.getElementById("username")) document.getElementById("username").textContent = finalUsername;
        if (document.getElementById("role")) document.getElementById("role").textContent = finalRole;
        if (document.getElementById("created_at")) document.getElementById("created_at").textContent = finalCreatedAt;
    }, 10);

    // Lanjut panggil data pesanan untuk tabel & card total belanja menggunakan username resmi
    loadTransactions(finalUsername);
}

// ======================
// LOAD TRANSAKSI & ISI TOTAL BELANJA
// ======================
async function loadTransactions(username) {
    const tbody = document.getElementById("transactionList");
    const totalPurchaseEl = document.getElementById("totalPurchase");

    try {
        const { data, error } = await supabaseClient
            .from("orders")
            .select("*")
            .eq("username", username)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Gagal memuat tabel orders:", error.message);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #ef4444;">Gagal memuat data</td></tr>`;
            if (totalPurchaseEl) totalPurchaseEl.textContent = "0 Sukses";
            return;
        }

        // Jika data transaksi kosong / belum pernah belanja
        if (!data || data.length === 0) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #94a3b8;">Belum ada riwayat transaksi</td></tr>`;
            if (totalPurchaseEl) totalPurchaseEl.textContent = "0 Sukses"; 
            return;
        }

        // Hitung berapa kali transaksi yang statusnya SUCCESS / DONE
        const transaksiSukses = data.filter(order => {
            const statusLower = String(order.status || '').toLowerCase();
            return statusLower === "success" || statusLower === "done";
        }).length;

        // Update card "Total Belanja" di dashboard utama
        if (totalPurchaseEl) {
            totalPurchaseEl.textContent = `${transaksiSukses} Sukses`;
        }

        // Render data ke dalam tabel riwayat transaksi
        if (tbody) {
            tbody.innerHTML = data.map(order => {
                let badgeClass = "pending";
                const statusLower = String(order.status || '').toLowerCase();
                
                if (statusLower === "success" || statusLower === "done") badgeClass = "success";
                if (statusLower === "failed" || statusLower === "cancelled" || statusLower === "batal") badgeClass = "failed";

                // --- LOGIKA KONDISI TOMBOL AKSI ---
                let actionButton = '';
                if (statusLower === 'pending') {
                    actionButton = `
                        <button class="btn-action btn-cancel" onclick="cancelTransaction('${order.id}', '${username}')">
                            Cancel
                        </button>
                    `;
                } else if (statusLower === 'success' || statusLower === 'done') {
                    actionButton = `
                        <button class="btn-action btn-locked" disabled>
                            <i class="fa fa-lock"></i> Locked
                        </button>
                    `;
                } else {
                    actionButton = `
                        <button class="btn-action btn-locked" disabled>
                            No Action
                        </button>
                    `;
                }

                return `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.id_transaksi_payment || '-'}</td>
                    <td>${order.product_name || order.product_id || '-'}</td>
                    <td>${order.payment_method || '-'}</td>
                    <td>
                        <span class="badge ${badgeClass}">
                            ${String(order.status || 'PENDING').toUpperCase()}
                        </span>
                    </td>
                    <td>
                        ${order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td>
                        ${actionButton}
                    </td>
                </tr>
                `;
            }).join("");
        }

    } catch (err) {
        console.error("Sistem crash di fungsi loadTransactions:", err);
        if (totalPurchaseEl) totalPurchaseEl.textContent = "0 Sukses";
    }
}

// ======================
// AKSI HAPUS TRANSAKSI (PERMANEN)
// ======================
async function cancelTransaction(id, username) {
    const konfirmasi = confirm(`Apakah kamu yakin ingin menghapus permanen transaksi #${id}?`);
    if (!konfirmasi) return;

    try {
        // Mengubah .update menjadi .delete() untuk menghapus record
        const { error } = await supabaseClient
            .from("orders")
            .delete() 
            .eq("id", id);

        if (error) {
            alert("Gagal menghapus transaksi: " + error.message);
            return;
        }

        alert(`Transaksi #${id} berhasil dihapus.`);
        // Refresh tabel setelah data dihapus
        loadTransactions(username);

    } catch (err) {
        console.error("Error saat menghapus transaksi:", err);
        alert("Terjadi kesalahan sistem saat mencoba menghapus transaksi.");
    }
}

// ======================
// DETAIL TRANSAKSI (Opsional jika masih dipakai)
// ======================
function viewTransaction(id) {
    alert("ID Transaksi: " + id);
}

// ======================
// LOAD PENGUMUMAN DARI DATABASE
// ======================
async function loadAnnouncements() {
    const announcementContainer = document.getElementById("announcementList");
    if (!announcementContainer) return;

    try {
        // Ambil data title, content, dan created_at dari tabel announcements
        const { data, error } = await supabaseClient
            .from("announcements")
            .select("title, content, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Gagal memuat pengumuman:", error.message);
            announcementContainer.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 10px; font-size: 12px;">
                    Gagal memuat pengumuman.
                </div>`;
            return;
        }

        // Kondisi jika isi data tabel kosong
        if (!data || data.length === 0) {
            announcementContainer.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 10px; font-size: 12px;">
                    Belum ada pengumuman terbaru.
                </div>`;
            return;
        }

        // Render struktur pengumuman secara berulang menggunakan map()
        announcementContainer.innerHTML = data.map(item => {
            const tanggalFormat = item.created_at 
                ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                : '-';

            return `
                <div class="news-item">
                    <div class="news-date">${tanggalFormat}</div>
                    <div class="news-title">${item.title || 'Tanpa Judul'}</div>
                    <div class="news-preview">${item.content || 'Tidak ada konten.'}</div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Sistem crash di fungsi loadAnnouncements:", err);
        announcementContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 10px; font-size: 12px;">
                Terjadi kesalahan sistem pengumuman.
            </div>`;
    }
}

// ======================
// STATUS SERVER (BEDROCK)
// ======================
async function loadServerStatus() {
    try {
        const response = await fetch("https://api.mcsrvstat.us/bedrock/3/play.alvelions.my.id:25513");
        const data = await response.json();

        const statusEl = document.getElementById("serverStatus");
        const countEl = document.getElementById("playerCount");

        if (!statusEl || !countEl) return;

        if (data.online) {
            statusEl.textContent = "ONLINE";
            statusEl.style.color = "#22c55e"; 
            countEl.textContent = `${data.players?.online || 0} pemain online`;
        } else {
            statusEl.textContent = "OFFLINE";
            statusEl.style.color = "#ef4444"; 
            countEl.textContent = "Server tidak tersedia";
        }
    } catch (err) {
        if (document.getElementById("serverStatus")) document.getElementById("serverStatus").textContent = "ERROR";
        if (document.getElementById("playerCount")) document.getElementById("playerCount").textContent = "Gagal mengambil data";
    }
}

// ======================
// CHART TREND PLAYER
// ======================
function initChart() {
    const ctx = document.getElementById("analyticsChart");
    if (!ctx) return;

    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["10m", "9m", "8m", "7m", "6m", "5m", "4m", "3m", "2m", "Sekarang"],
            datasets: [{
                label: "Player Online",
                data: [5, 8, 6, 12, 9, 15, 14, 18, 17, 20],
                borderColor: "#facc15", 
                backgroundColor: "rgba(250, 204, 21, 0.1)", 
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: "#fff", font: { family: 'Poppins', size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#94a3b8", font: { family: 'Poppins', size: 10 } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#94a3b8", font: { family: 'Poppins', size: 10 }, stepSize: 5 }
                }
            }
        }
    });
}
