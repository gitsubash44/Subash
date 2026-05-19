const params =
  new URLSearchParams(window.location.search);

const categoryId = params.get("id");

fetch("data/articles.json")
  .then(response => response.json())
  .then(data => {

    const category =
      data.find(item => item.id == categoryId);

    const container =
      document.getElementById("posts-container");

    if(category){

      document.getElementById(
        "page-article-title"
      ).innerText = category.category;

      category.posts.forEach(post => {

        container.innerHTML += `

        <div class="col-12">

          <div class="card bg-dark text-light border-0 shadow-lg rounded-4 overflow-hidden">

            <a href="article-read.html?id=${post.id}"
               class="text-decoration-none text-light d-flex flex-column flex-md-row">

              <div class="flex-shrink-0">

                <img src="${post.image}"
                     style="width:200px; height:180px; object-fit:cover;">

              </div>

              <div class="card-body p-4">

                <h5 class="fw-bold mb-2">
                  ${post.title}
                </h5>

                <small class="text-secondary">
                  ${post.author}
                  • ${post.date}
                  • ${post.readTime}
                  • ${post.views}
                </small>

                <p class="small mt-2 text-secondary">
                  ${post.description}
                </p>

              </div>

            </a>

          </div>

        </div>

        `;
      });

    }

  });