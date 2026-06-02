// ===================================================
// KONFIGURASI UTAMA SERVER MINECRAFT
// ===================================================
const MINECRAFT_SERVER_IP = 'alvelionsmc.mineidhost.icu:19207'; // Ganti dengan IP server Alvelions MC kamu

// Inisialisasi Chart global agar bisa di-update dari fungsi mana saja
let playerChart = null;

document.addEventListener("DOMContentLoaded", () => {
    initChart();
    checkUser();
    
    // Jalankan pelacakan server MC real-time
    updateMinecraftStats();
    setInterval(updateMinecraftStats, 60000); // Auto refresh setiap 60 detik
});

// ===================================================
// INISIALISASI GRAFIK REAL-TIME (CHART.JS)
// ===================================================
function initChart() {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    playerChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Diisi waktu otomatis (Jam:Menit)
            datasets: [{
                label: 'Pemain Online',
                data: [], // Diisi total online otomatis
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Poppins' } } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Poppins' }, beginAtZero: true } }
            }
        }
    });
}

// ===================================================
// API MINECRAFT SERVER REAL-TIME STATUS
// ===================================================
// ===================================================
// API MINECRAFT SERVER REAL-TIME STATUS (BEDROCK VERSION)
// ===================================================
async function updateMinecraftStats() {
    try {
        // Perhatikan penambahan kata "/bedrock/" di dalam URL API
        const response = await fetch(`https://api.mcsrvstat.us/bedrock/3/${MINECRAFT_SERVER_IP}`);
        const data = await response.json();

        const statusElement = document.getElementById('serverStatus');
        const countElement = document.getElementById('playerCount');

        if (!statusElement || !countElement) return;

        if (data.online) {
            statusElement.innerText = "Online";
            statusElement.style.color = "#22c55e"; 
            
            // Mengambil data player aktif dari protokol Bedrock
            const onlinePlayers = data.players?.online ?? 0;
            const maxPlayers = data.players?.max ?? 20;
            
            countElement.innerText = `${onlinePlayers} / ${maxPlayers} Players Active`;

            // Update data ke Chart jika grafiknya aktif
            if (playerChart) {
                const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                
                playerChart.data.labels.push(waktuSekarang);
                playerChart.data.datasets[0].data.push(onlinePlayers);

                // Batasi titik koordinat grafik maksimal 7 data terakhir
                if (playerChart.data.labels.length > 7) {
                    playerChart.data.labels.shift();
                    playerChart.data.datasets[0].data.shift();
                }
                playerChart.update();
            }
        } else {
            statusElement.innerText = "Offline";
            statusElement.style.color = "#ef4444"; 
            countElement.innerText = "Server sedang dimatikan";
        }
    } catch (error) {
        console.error("Gagal memuat status Minecraft API:", error);
        const statusElement = document.getElementById('serverStatus');
        if (statusElement) statusElement.innerText = "Error API";
    }
}

// =====================
// CEK USER LOGIN
// =====================
async function checkUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Auth error:", error);
        return;
    }

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    loadProfile(user.id);
    loadAnnouncements();
}

// =====================
// LOAD PROFILE USER
// =====================
async function loadProfile(userId) {
    const { data, error } = await supabaseClient
        .from("users_profile")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Profile error:", error);
        return;
    }

    document.getElementById("username").textContent = data.username || "-";
    document.getElementById("panelName").textContent = data.username || "USER PANEL";
    
    document.getElementById("created_at").textContent = data.created_at
        ? new Date(data.created_at).toLocaleDateString("id-ID")
        : "-";

    // Panggil logika data transaksi & saldo koin
    loadOrderStatus(data.username);
    loadTransactions(data.username);
}

// =====================
// LOAD TRANSACTIONS (RIWAYAT ORDERS USER)
// =====================
async function loadTransactions(username) {
    const tbody = document.getElementById("transactionList");
    if (!tbody) return;

    // Ambil data produk terlebih dahulu secara terpisah
    const { data: productsData } = await supabaseClient
        .from("products") 
        .select("id, name");

    const productMap = {};
    if (productsData) {
        productsData.forEach(p => {
            productMap[p.id] = p.name;
        });
    }

    const { data, error } = await supabaseClient
        .from("orders")
        .select(`
            id,
            id_transaksi,
            id_transaksi_payment,
            product_id,
            payment_method,
            status,
            created_at
        `)
        .eq("username", username)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='7'>Gagal load transaksi</td></tr>";
        return;
    }

    // ===================================================
    // HITUNG TOTAL BELANJA DARI TABLE ORDERS
    // ===================================================
    const totalPurchaseEl = document.getElementById("totalPurchase");
    if (totalPurchaseEl) {
        // Opsi A: Menghitung jumlah akumulasi transaksi sukses milik user
        const transaksiSukses = data ? data.filter(item => item.status === "done" || item.status === "success").length : 0;
        
        // Menampilkan hasil hitungan ke komponen card dashboard (.innerText)
        totalPurchaseEl.innerText = `${transaksiSukses} Sukses`;
        
        /* 💡 TIPS TAMBAHAN:
           Jika kamu ingin menampilkan total transaksi keseluruhan (termasuk pending), 
           kamu bisa ganti baris di atas menjadi:
           totalPurchaseEl.innerText = `${data ? data.length : 0} Transaksi`;
        */
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7'>Belum ada transaksi</td></tr>";
        return;
    }

    tbody.innerHTML = data.map(item => {
        const isPending = item.status === "pending";
        const productName = productMap[item.product_id] || item.product_id || '-';

        return `
            <tr>
                <td>${item.id_transaksi || '-'}</td>
                <td>${item.id_transaksi_payment || '-'}</td>
                <td>${productName}</td>
                <td>${item.payment_method || '-'}</td>
                <td>
                    <span class="badge ${item.status}">
                        ${item.status}
                    </span>
                </td>
                <td>
                    ${item.created_at
                        ? new Date(item.created_at).toLocaleDateString("id-ID")
                        : '-'}
                </td>
                <td>
                    ${isPending
                        ? `<button onclick="deleteTransaction('${item.id}')" style="background:#ef4444;color:#fff;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">Delete</button>`
                        : `<button disabled style="background:#555;color:#aaa;padding:6px 10px;border:none;border-radius:6px;cursor:not-allowed;">Locked</button>`
                    }
                </td>
            </tr>
        `;
    }).join("");
}
// =====================
// LOAD ANNOUNCEMENTS
// =====================
async function loadAnnouncements() {
    // Mengambil data spesifik field title dan content dari table announcements
    const { data, error } = await supabaseClient
        .from("announcements")
        .select("title, content, created_at")
        .order("created_at", { ascending: false });

    // Target container pembungkus berita di dashboard.html kamu
    const container = document.querySelector(".news-list");
    if (!container) return;

    if (error) {
        console.error("Announcement error:", error);
        container.innerHTML = "<p style='color: #ef4444; font-size: 12px;'>Gagal memuat pengumuman.</p>";
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p style='color: #64748b; font-size: 12px;'>Tidak ada pengumuman terbaru.</p>";
        return;
    }

    // Render data menggunakan field title dan content ke dalam class HTML kamu
    container.innerHTML = data.map(item => {
        const tglBerita = item.created_at 
            ? new Date(item.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })
            : "Baru Saja";

        return `
            <div class="news-item">
                <div class="news-date">${tglBerita}</div>
                <div class="news-title">${item.title || 'Tanpa Judul'}</div>
                <div class="news-preview">${item.content || 'Tidak ada konten.'}</div>
            </div>
        `;
    }).join("");
}
// =====================
// LOAD STATUS RANK DARI TRANSACTIONS TERAKHIR (KHUSUS STATUS DONE)
// =====================
async function loadOrderStatus(username) {
    const { data: productsData } = await supabaseClient
        .from("products") 
        .select("id, name");

    const productMap = {};
    if (productsData) {
        productsData.forEach(p => {
            productMap[String(p.id)] = p.name;
        });
    }

    const { data, error } = await supabaseClient
        .from("orders")
        .select("product_id, status, created_at")
        .eq("username", username)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Order error:", error);
        const roleEl = document.getElementById("role");
        if (roleEl) roleEl.textContent = "User";
        return;
    }

    const latest = data?.[0];
    const roleEl = document.getElementById("role");
    if (!roleEl) return;

    if (!latest) {
        roleEl.textContent = "User";
        return;
    }

    const rankName = productMap[String(latest.product_id)] || latest.product_id || "User";
    roleEl.textContent = rankName;
}

// =====================
// DELETE TRANSACTION
// =====================
async function deleteTransaction(id){
    const confirmDelete = confirm("Yakin ingin menghapus transaksi ini?");
    if(!confirmDelete) return;

    const { error } = await supabaseClient
        .from("orders")
        .delete()
        .eq("id", id);

    if(error){
        console.error("Delete error:", error);
        alert("Gagal menghapus transaksi");
        return;
    }

    alert("Transaksi berhasil dihapus");
    location.reload();
}

// =====================
// LOGOUT
// =====================
async function logout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        return;
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
}
