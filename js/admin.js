console.log("ADMIN JS JALAN");

let incomeChart;

// =====================
// PRODUCTS
// =====================
async function addProduct() {
    const name = document.getElementById("name").value;
    const price = document.getElementById("price").value;
    const desc = document.getElementById("desc").value;

    if (!name || !price) return alert("Nama & harga wajib!");

    await supabaseClient.from("products").insert([
        { name, price: Number(price), desc }
    ]);

    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    document.getElementById("desc").value = "";

    loadProducts();
}

async function loadProducts() {
    const { data } = await supabaseClient.from("products").select("*");

    const list = document.getElementById("productList");
    if (!list) return;

    list.innerHTML = "";

    (data || []).forEach(p => {
        list.innerHTML += `
        <tr>
            <td>${p.name}</td>
            <td>Rp ${Number(p.price).toLocaleString()}</td>
            <td>
                <div class="action-btn">
                    <button class="btn-edit"
                        onclick="editProduct('${p.id}', '${p.name}', '${p.price}', '${p.desc || ""}')">
                        Edit
                    </button>

                    <button class="btn-delete"
                        onclick="deleteProduct('${p.id}')">
                        Hapus
                    </button>
                </div>
            </td>
        </tr>
        `;
    });
}

async function editProduct(id, name, price, desc) {
    const newName = prompt("Edit Nama Produk:", name);
    const newPrice = prompt("Edit Harga:", price);
    const newDesc = prompt("Edit Deskripsi:", desc);

    if (!newName || !newPrice) return;

    await supabaseClient
        .from("products")
        .update({
            name: newName,
            price: Number(newPrice),
            desc: newDesc
        })
        .eq("id", id);

    loadProducts();
}

async function deleteProduct(id) {
    if (!confirm("Yakin hapus produk ini?")) return;

    await supabaseClient
        .from("products")
        .delete()
        .eq("id", id);

    loadProducts();
}

// =====================
// ORDERS
// =====================
async function loadOrders() {
    const { data } = await supabaseClient.from("orders").select("*");

    const list = document.getElementById("orderList");
    if (!list) return;

    list.innerHTML = "";

    (data || []).forEach(o => {
        list.innerHTML += `
        <tr>
            <td>${o.id}</td>
            <td>${o.id_transaksi}</td>
            <td>${o.id_transaksi_payment || "-"}</td>
            <td>${o.product_id}</td>
            <td>${o.username}</td>
            <td>${o.gamertag}</td>
            <td>${o.phone}</td>
            <td>${o.payment_method}</td>
            <td>
                <select onchange="updateStatus('${o.id}', this.value)">
                    <option value="pending" ${o.status=="pending"?"selected":""}>pending</option>
                    <option value="done" ${o.status=="done"?"selected":""}>done</option>
                    <option value="none" ${o.status=="none"?"selected":""}>none</option>
                </select>
            </td>
            <td>${o.created_at}</td>

            <!-- 🔥 BUTTON DELETE -->
            <td>
                <button class="btn-delete" onclick="deleteOrder('${o.id}')">
                    Delete
                </button>
            </td>
        </tr>
        `;
    });
}

async function updateStatus(id, status) {
    await supabaseClient
        .from("orders")
        .update({ status })
        .eq("id", id);

    loadOrders();
    loadIncome();
}

// =====================
// INCOME (FIXED 100%)
// =====================
async function loadIncome() {
    const { data: orders } = await supabaseClient.from("orders").select("*");
    const { data: products } = await supabaseClient.from("products").select("*");

    const safeOrders = orders || [];
    const safeProducts = products || [];

    let total = 0;
    let summary = {};

    safeOrders.forEach(o => {

        if (o.status !== "done") return;

        const product = safeProducts.find(p =>
            String(p.id) === String(o.product_id)
        );

        if (!product) return;

        const price = Number(product.price);

        total += price;

        if (!summary[product.name]) {
            summary[product.name] = {
                qty: 0,
                price: price,
                total: 0
            };
        }

        summary[product.name].qty += 1;
        summary[product.name].total += price;
    });

    const totalEl = document.getElementById("incomeTotal");
    if (totalEl) {
        totalEl.innerText = "Rp " + total.toLocaleString();
    }

    const table = document.getElementById("incomeTable");
    if (table) {
        table.innerHTML = "";

        Object.keys(summary).forEach(name => {
            const s = summary[name];

            table.innerHTML += `
            <tr>
                <td>${name}</td>
                <td>${s.qty}</td>
                <td>Rp ${s.price.toLocaleString()}</td>
                <td>Rp ${s.total.toLocaleString()}</td>
            </tr>
            `;
        });
    }

    renderChart(summary);
}

// =====================
// CHART
// =====================
function renderChart(summary) {
    const canvas = document.getElementById("incomeChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (incomeChart) incomeChart.destroy();

    incomeChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(summary),
            datasets: [{
                label: "Pendapatan",
                data: Object.values(summary).map(x => x.total)
            }]
        }
    });
}

// =====================
// AUTO LOAD
// =====================
loadProducts();
loadOrders();
loadIncome();

async function deleteOrder(id) {
    if (!confirm("Yakin mau hapus order ini?")) return;

    const { error } = await supabaseClient
        .from("orders")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Gagal hapus order: " + error.message);
        return;
    }

    loadOrders();
    loadIncome();
}