fetch("data/articles.json")
  .then(response => response.json())
  .then(data => {

    const container =
      document.getElementById("articles-container");

    data.forEach(category => {

      container.innerHTML += `

      <div class="col-lg-3">

        <a href="article-details.html?id=${category.id}">

          <div class="service-info p-3 shadow-sm text-center">

            <h4 class="text-light mb-3">
              ${category.category}
            </h4>

            <img src="${category.image}"
                 class="img-fluid mb-3"
                 style="width:100%; height:150px; object-fit:cover;">

            <p class="text-light">
              ${category.posts.length} Posts
            </p>

          </div>

        </a>

      </div>

      `;

    });

  });