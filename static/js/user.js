fetch("http://127.0.0.1:5000/products")
  .then(r => r.json())
  .then(list => {
    const container = document.getElementById("product-list");
    let html = "";
    list.forEach(p => {
      html += `
        <div class="product-card">
          <img src="${p.photos[0] || 'placeholder.jpg'}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.price} Bs</p>
          <button onclick="addToCart('${p._id}')">Añadir al carrito</button>
        </div>`;
    });
    container.innerHTML = html;
  });
