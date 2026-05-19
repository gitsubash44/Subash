const params =
  new URLSearchParams(window.location.search);

const postId = params.get("id");

fetch("data/articles.json")
  .then(response => response.json())
  .then(data => {

    let foundPost = null;
    let currentCategory = null;

    // Find current post
    data.forEach(category => {

      category.posts.forEach(post => {

        if(post.id == postId){

          foundPost = post;
          currentCategory = category;

        }

      });

    });

    // Main Article
    if(foundPost){

      document.title =
        foundPost.title + " - Subash Dhami";

      document.getElementById(
        "article-title"
      ).innerText = foundPost.title;

      document.getElementById(
        "article-image"
      ).src = foundPost.image;

      document.getElementById(
        "article-image"
      ).alt = foundPost.title;

      document.getElementById(
        "article-meta"
      ).innerHTML = `
        ${foundPost.author}
        • ${foundPost.date}
        • ${foundPost.readTime}
        • ${foundPost.views}
      `;

      document.getElementById(
        "article-content"
      ).innerHTML = foundPost.content;

    }

    // Related Articles
    const relatedContainer =
      document.getElementById("related-articles");

    if(currentCategory){

      currentCategory.posts.forEach(post => {

        // Skip current article
        if(post.id != postId){

          relatedContainer.innerHTML += `

          <div class="col-md-4">

            <a href="article-read.html?id=${post.id}"
               class="text-decoration-none text-light">

              <div class="card bg-dark border-0 shadow-sm rounded-4 h-100">

                <img src="${post.image}"
                     class="card-img-top rounded-top-4"
                     style="height:200px; object-fit:cover;">

                <div class="card-body">

                  <h6 class="fw-bold">
                    ${post.title}
                  </h6>

                  <small class="text-secondary">

                    ${post.date}
                    • ${post.readTime}

                  </small>

                  <p class="small mb-0 text-secondary mt-2">

                    ${post.description}

                  </p>

                </div>

              </div>

            </a>

          </div>

          `;

        }

      });

    }

  })
  .catch(error => {

    console.log("Error loading article:", error);

  });