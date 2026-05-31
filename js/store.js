const productsContainer = document.getElementById("products");

async function loadProducts() {

    console.log("Store loaded");

    const { data, error } = await supabaseClient
        .from("products")
        .select("*");

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
        productsContainer.innerHTML = `
            <p style="color:red;">Error: ${error.message}</p>
        `;
        return;
    }

    if (!data || data.length === 0) {
        productsContainer.innerHTML = `
            <p>Belum ada produk di store.</p>
        `;
        return;
    }

    productsContainer.innerHTML = "";

    data.forEach(product => {

        productsContainer.innerHTML += `
        <div class="product-card">

            <img src="${product.image || 'https://via.placeholder.com/300'}" />

            <div class="product-content">

                <h3>${product.name}</h3>

                <p>${product.description || ''}</p>

                <div class="product-price">
                    Rp ${product.price.toLocaleString()}
                </div>

                <button class="buy-btn" onclick="buyProduct(${product.id})">
                    Beli
                </button>

            </div>

        </div>
        `;
    });
}

/* =========================
   BUY → ke checkout form
========================= */
function buyProduct(productId) {

    localStorage.setItem("selectedProduct", productId);

    window.location.href = "checkout.html";
}

loadProducts();