document.addEventListener("DOMContentLoaded", () => {
    checkUser();
});

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

    document.getElementById("username").textContent =
        data.username || "-";
    document.getElementById("panelName").textContent =
        data.username || "USER PANEL";
    document.getElementById("role").textContent =
        data.role || "user";

    document.getElementById("created_at").textContent =
        data.created_at
            ? new Date(data.created_at).toLocaleDateString("id-ID")
            : "-";

    // =====================
    // LOAD TRANSACTIONS + STATUS
    // =====================
    loadOrderStatus(data.username);
    loadTransactions(data.username);
}

// =====================
// LOAD TRANSACTIONS (RIWAYAT ORDERS USER)
// =====================
async function loadTransactions(username) {

    const tbody = document.getElementById("transactionList");

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

    if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7'>Belum ada transaksi</td></tr>";
        return;
    }

    tbody.innerHTML = data.map(item => {

        const isPending = item.status === "pending";

        return `
            <tr>
                <td>${item.id_transaksi || '-'}</td>
                <td>${item.id_transaksi_payment || '-'}</td>
                <td>${item.product_id || '-'}</td>
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
                    ${
                        isPending
                        ? `<button onclick="deleteTransaction('${item.id}')" style="background:#ef4444;color:#fff;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
                            Delete
                           </button>`
                        : `<button disabled style="background:#555;color:#aaa;padding:6px 10px;border:none;border-radius:6px;cursor:not-allowed;">
                            Locked
                           </button>`
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

    const { data, error } = await supabaseClient
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

    const container = document.getElementById("announcementList");

    if (error) {
        console.error("Announcement error:", error);
        container.innerHTML = "<p>Gagal memuat pengumuman.</p>";
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p>Tidak ada pengumuman.</p>";
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="announcement-item">
            <h3>${item.title}</h3>
            <p>${item.content}</p>
        </div>
    `).join("");
}

// =====================
// LOAD STATUS ORDER TERAKHIR
// =====================
async function loadOrderStatus(username) {

    const { data, error } = await supabaseClient
        .from("orders")
        .select("status, created_at")
        .eq("username", username)
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Order error:", error);
        return;
    }

    const latest = data?.[0];
    const roleEl = document.getElementById("role");

    if (!latest) {
        roleEl.textContent += " | Status: Belum ada order";
        return;
    }

    roleEl.textContent += " | Status: " + latest.status;
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

// =====================
// DELETE TRANSACTION
// =====================
async function deleteTransaction(id){

    const confirmDelete = confirm(
        "Yakin ingin menghapus transaksi ini?"
    );

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