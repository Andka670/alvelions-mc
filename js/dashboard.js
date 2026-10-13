document.addEventListener("DOMContentLoaded", () => {
    checkUser();
    loadServerStatus();
    initChart();
    loadAnnouncements(); // Menjalankan fungsi muat pengumuman saat halaman siap
});

// Data ini hanya diisi dari riwayat pengguna yang telah lolos pemeriksaan login.
let cachedUserTransactions = [];
let cachedProductNames = {};
let cachedTransactionUsername = "";

// TPS display simulation only. The status checker API does not measure server TPS.
function startTpsSimulation(element) {
    if (!element || element.dataset.tpsSimulationStarted === "1") return;
    element.dataset.tpsSimulationStarted = "1";
    element.title = "Angka simulasi 19.0–20.0 TPS; bukan pembacaan aktual server.";
    let value = 19.6;
    let direction = Math.random() < 0.5 ? -1 : 1;
    element.textContent = value.toFixed(1);

    const tick = () => {
        if (Math.random() < 0.34) direction *= -1;
        value += direction * (0.1 + Math.random() * 0.2);
        if (value >= 20.0) { value = 20.0; direction = -1; }
        if (value <= 19.0) { value = 19.0; direction = 1; }
        element.textContent = value.toFixed(1);
        window.setTimeout(tick, 1200 + Math.random() * 1500);
    };
    window.setTimeout(tick, 1000 + Math.random() * 700);
}

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
        const [
            { data: orders, error: ordersError },
            { data: products, error: productsError }
        ] = await Promise.all([
            supabaseClient
                .from("orders")
                .select("*")
                .eq("username", username)
                .order("created_at", { ascending: false }),
        
            supabaseClient
                .from("products")
                .select("id, name")
        ]);
        
        if (ordersError || productsError) {
            cachedUserTransactions = [];
            cachedProductNames = {};
            cachedTransactionUsername = username;
            console.error("Gagal memuat data:", ordersError || productsError);
        
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align:center;color:#ef4444;">
                            Gagal memuat data
                        </td>
                    </tr>`;
            }
        
            if (totalPurchaseEl) totalPurchaseEl.textContent = "0 Sukses";
            return;
        }

        // Simpan salinan data yang sudah difilter untuk akun ini, dipakai tombol ekspor CSV.
        cachedUserTransactions = Array.isArray(orders) ? orders : [];
        cachedProductNames = {};
        (products || []).forEach(product => {
            cachedProductNames[product.id] = product.name;
        });
        cachedTransactionUsername = username;

        // Jika data transaksi kosong / belum pernah belanja
        if (!orders || orders.length === 0) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align:center;color:#94a3b8;">
                            Belum ada riwayat transaksi
                        </td>
                    </tr>`;
            }
        
            if (totalPurchaseEl) {
                totalPurchaseEl.textContent = "0 Sukses";
            }
        
            return;
        }

        // Hitung berapa kali transaksi yang statusnya SUCCESS / DONE
        const transaksiSukses = orders.filter(order => {
            const statusLower = String(order.status || '').toLowerCase();
            return statusLower === "success" || statusLower === "done";
        }).length;

        // Update card "Total Belanja" di dashboard utama
        if (totalPurchaseEl) {
            totalPurchaseEl.textContent = `${transaksiSukses} Sukses`;
        }

        // Render data ke dalam tabel riwayat transaksi
        if (tbody) {
                const productMap = {};
                
                (products || []).forEach(product => {
                    productMap[product.id] = product.name;
                });
                
                tbody.innerHTML = orders.map(order => {
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
                    <td>${productMap[order.product_id] || `Produk #${order.product_id}`}</td>
                    <td>${order.quantity ?? 1}</td>
                    <td>
                        Rp ${(Number(order.total_price) || 0).toLocaleString("id-ID")}
                    </td>
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
        cachedUserTransactions = [];
        cachedProductNames = {};
        cachedTransactionUsername = username || "";
        console.error("Sistem crash di fungsi loadTransactions:", err);
        if (totalPurchaseEl) totalPurchaseEl.textContent = "0 Sukses";
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ef4444;">Riwayat belum bisa dimuat.</td></tr>`;
        }
    }
}

// ======================
// DOWNLOAD RIWAYAT TRANSAKSI (CSV)
// Ekspor hanya memakai data transaksi milik pengguna yang sedang login.
// ======================
function downloadTransactionHistory() {
    const button = document.getElementById("downloadTransactionsBtn");
    if (!cachedTransactionUsername) {
        alert("Data akun belum siap. Tunggu sampai riwayat transaksi selesai dimuat.");
        return;
    }
    if (!cachedUserTransactions.length) {
        alert("Belum ada riwayat transaksi yang dapat diunduh.");
        return;
    }

    const headers = [
        "ID Order", "ID Invoice", "ID Payment", "Username", "Gamertag Minecraft",
        "Produk", "Jumlah", "Total (IDR)", "Metode Pembayaran", "Status", "Tanggal"
    ];
    const safeCsvCell = (value) => {
        let text = value == null ? "" : String(value);
        // Cegah CSV/formula injection saat berkas dibuka lewat aplikasi spreadsheet.
        if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    };

    const rows = cachedUserTransactions.map(order => {
        const productName = cachedProductNames[order.product_id] || `Produk #${order.product_id ?? "?"}`;
        const dateText = order.created_at ? new Date(order.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-";
        return [
            order.id,
            order.id_transaksi || "",
            order.id_transaksi_payment || "",
            order.username || cachedTransactionUsername,
            order.gamertag || "",
            productName,
            order.quantity ?? 1,
            Number(order.total_price) || 0,
            order.payment_method || "",
            String(order.status || "PENDING").toUpperCase(),
            dateText
        ];
    });

    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(safeCsvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    anchor.href = url;
    anchor.download = `riwayat-transaksi-alvelions-${timestamp}.csv`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (button) {
        const original = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>CSV Diunduh</span>';
        window.setTimeout(() => { button.innerHTML = original; }, 1800);
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
    const statusEl = document.getElementById("serverStatus");
    const countEl = document.getElementById("playerCount");
    const pingEl = document.getElementById("serverPing");
    const pingTitle = document.getElementById("serverPingTitle");
    const tpsEl = document.getElementById("serverTps");
    if (pingTitle) pingTitle.textContent = window.AlvelionsBedrockStatus?.checkerUrl ? "Ping Jakarta" : "Ping Checker";
    if (!statusEl || !countEl) return;

    const showStatus = (label, color) => {
        statusEl.textContent = label;
        statusEl.style.color = color;
    };

    showStatus("MENGECEK...", "#f59e0b");
    countEl.textContent = "Menghubungkan ke server...";
    if (pingEl) pingEl.textContent = "...";
    // Run animated display independently from live status refreshes.
    startTpsSimulation(tpsEl);

    try {
        if (!window.AlvelionsBedrockStatus) throw new Error("Modul status server belum termuat.");
        const data = await window.AlvelionsBedrockStatus.check();
        const current = window.AlvelionsBedrockStatus.isCurrent(data);
        const verdict = String(data?.verdict || data?.status || "unknown").toLowerCase();
        const latencyValue = data?.latencyMs ?? data?.latency;
        const latency = latencyValue === null || latencyValue === undefined || latencyValue === ""
            ? NaN : Number(latencyValue);
        if (pingEl) {
            pingEl.textContent = Number.isFinite(latency) && latency >= 0
                ? `${Math.round(latency)} ms` : "--";
        }

        if (current && verdict === "online") {
            showStatus("ONLINE", "#22c55e");
            const players = data.players || {};
            const online = Number.isFinite(players.online) ? players.online : "--";
            const max = Number.isFinite(players.max) ? players.max : "--";
            countEl.textContent = `${online} / ${max} pemain online`;
        } else if (current && verdict === "offline") {
            showStatus("OFFLINE", "#ef4444");
            countEl.textContent = "Server tidak merespons";
        } else {
            showStatus(current ? "TIDAK TERDETEKSI" : "DATA KEDALUWARSA", "#f59e0b");
            const evidence = String(data?.evidenceCode || data?.unknownReason || data?.freshnessReason || data?.reason || data?.message || "").trim();
            const freshness = String(data?.freshness || "tidak dilaporkan").toLowerCase();
            const method = String(data?.method || "Bedrock RakNet checker");
            countEl.textContent = evidence || `API mengembalikan verdict "unknown" tanpa kode alasan (freshness: ${freshness}; metode: ${method}). Periksa port UDP Bedrock publik.`;
        }
    } catch (err) {
        console.error("Server status error:", err);
        showStatus("GAGAL CEK", "#f59e0b");
        countEl.textContent = err?.message || "Gagal mengambil data status server";
        if (pingEl) pingEl.textContent = "--";
    }
}

setInterval(loadServerStatus, 30000);

// ======================
// CHART TREND PLAYER
// ======================
function initChart() {
    const canvas = document.getElementById("analyticsChart");
    if (!canvas || typeof Chart === "undefined") return;

    const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
    const palette = () => isLight() ? {
        text: "#645a42",
        muted: "#756d5a",
        grid: "rgba(92, 73, 28, 0.10)"
    } : {
        text: "#e5e7eb",
        muted: "#9ca3af",
        grid: "rgba(255, 255, 255, 0.065)"
    };
    const colors = palette();

    const chart = new Chart(canvas, {
        type: "line",
        data: {
            labels: ["10m", "9m", "8m", "7m", "6m", "5m", "4m", "3m", "2m", "Sekarang"],
            datasets: [{
                label: "Player Online",
                data: [5, 8, 6, 12, 9, 15, 14, 18, 17, 20],
                borderColor: "#e9b916",
                backgroundColor: "rgba(250, 204, 21, 0.13)",
                fill: true,
                tension: 0.38,
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#ffe88a",
                pointBorderColor: "#15130a",
                pointBorderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: colors.text, usePointStyle: true, pointStyle: "circle", boxWidth: 8, padding: 18, font: { family: "Poppins", size: 11, weight: "600" } }
                },
                tooltip: {
                    backgroundColor: isLight() ? "rgba(255,253,245,.97)" : "rgba(14,15,19,.97)",
                    titleColor: isLight() ? "#342a10" : "#fff8dc",
                    bodyColor: isLight() ? "#5c5138" : "#e5e7eb",
                    borderColor: "rgba(233,185,22,.36)",
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    cornerRadius: 10
                }
            },
            scales: {
                x: {
                    grid: { color: colors.grid, drawBorder: false },
                    border: { display: false },
                    ticks: { color: colors.muted, font: { family: "Poppins", size: 10 }, maxRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid, drawBorder: false },
                    border: { display: false },
                    ticks: { color: colors.muted, font: { family: "Poppins", size: 10 }, stepSize: 5, padding: 8 }
                }
            }
        }
    });

    // Keep chart labels legible when the site automatically switches theme by WIB.
    const observer = new MutationObserver(() => {
        const next = palette();
        chart.options.plugins.legend.labels.color = next.text;
        chart.options.plugins.tooltip.backgroundColor = isLight() ? "rgba(255,253,245,.97)" : "rgba(14,15,19,.97)";
        chart.options.plugins.tooltip.titleColor = isLight() ? "#342a10" : "#fff8dc";
        chart.options.plugins.tooltip.bodyColor = isLight() ? "#5c5138" : "#e5e7eb";
        chart.options.scales.x.ticks.color = next.muted;
        chart.options.scales.y.ticks.color = next.muted;
        chart.options.scales.x.grid.color = next.grid;
        chart.options.scales.y.grid.color = next.grid;
        chart.update("none");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
