import { supabase } from "./supabase.js";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =====================
// LOAD DATA SAAT HALAMAN DIBUKA
// =====================
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadOrders();
});


// =====================
// PAGE SWITCH (opsional backup)
// =====================
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = "none");
    document.getElementById(page).style.display = "block";
}


// =====================
// CRUD PRODUCTS
// =====================

// ADD PRODUCT
async function addProduct() {
    const name = document.getElementById("name").value;
    const price = document.getElementById("price").value;
    const desc = document.getElementById("desc").value;

    if (!name || !price) return alert("Nama & harga wajib diisi!");

    const { error } = await client
        .from("products")
        .insert([{ name, price, description: desc }]);

    if (error) {
        alert("Gagal tambah produk");
        console.log(error);
        return;
    }

    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    document.getElementById("desc").value = "";

    loadProducts();
}


// LOAD PRODUCTS
async function loadProducts() {
    const { data, error } = await client
        .from("products")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    const table = document.getElementById("productList");
    table.innerHTML = "";

    data.forEach(item => {
        table.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>Rp ${item.price}</td>
                <td>
                    <button onclick="deleteProduct(${item.id})">Hapus</button>
                </td>
            </tr>
        `;
    });
}


// DELETE PRODUCT
async function deleteProduct(id) {
    const confirmDelete = confirm("Hapus produk ini?");
    if (!confirmDelete) return;

    const { error } = await client
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        console.log(error);
        return;
    }

    loadProducts();
}


// =====================
// ORDERS (READ ONLY + APPROVE STATUS)
// =====================

async function loadOrders() {
    const { data, error } = await client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    console.log("Orders:", data);

    calculateIncome(data);
}


// OPTIONAL: UPDATE STATUS ORDER
async function updateStatus(id, status) {
    const { error } = await client
        .from("orders")
        .update({ status })
        .eq("id", id);

    if (error) {
        console.log(error);
        return;
    }

    loadOrders();
}


// =====================
// INCOME CALCULATION
// =====================
function calculateIncome(orders) {
    let total = 0;

    orders.forEach(o => {
        if (o.status === "paid") {
            total += Number(o.total || 0);
        }
    });

    document.getElementById("incomeTotal").innerText =
        "Rp " + total.toLocaleString("id-ID");
}