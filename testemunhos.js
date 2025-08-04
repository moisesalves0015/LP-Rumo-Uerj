const logo = "assets/imgs/Logo.svg"

        const alunosData = [
            {
                category: "Mente Primine",
                name: "Meteo",
                id: "1000",
                photo: "Logo.svg",
                testimonial: "Torem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum alapibus consectetur adipiscing elit. Donec rutrum alapibus iuticisus."
            },
            {
                category: "Mente Primine",
                name: "Tutum",
                id: "1000",
                photo: "assets/img/tutum.jpg",
                testimonial: "Torem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum alapibus iuticisus."
            },
            {
                category: "Juice Canalide",
                name: "Juice",
                id: "1001",
                photo: "assets/img/juice.jpg",
                testimonial: "Torem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum alapibus consectetur adipiscing elit. Donec rutrum alapibus iuticisus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            },
            {
                category: "Outros",
                name: "Aluno Exemplar",
                id: "2000",
                photo: "assets/img/aluno.jpg",
                testimonial: "Torem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum alapibus consectetur adipiscing elit. Donec rutrum alapibus iuticisus."
            },
            {
                category: "Antonio Consanha",
                name: "Antonio Consanha",
                id: "1000",
                photo: "assets/img/antonio1.jpg",
                testimonial: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
            },
            {
                category: "Antonio Consanha",
                name: "Antonio",
                id: "1001",
                photo: "assets/img/antonio2.jpg",
                testimonial: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
            },
            {
                category: "Antonio Consanha",
                name: "Antonio",
                id: "1002",
                photo: "assets/img/antonio3.jpg",
                testimonial: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
            },
            {
                category: "Antonio Consanha",
                name: "Antonio",
                id: "1003",
                photo: "assets/img/antonio4.jpg",
                testimonial: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi."
            },
            {
                category: "Antonio Consanha",
                name: "Antonio",
                id: "1003",
                photo: "assets/img/antonio4.jpg",
                testimonial: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi."
            }
        ];

        // Variáveis para controle de exibição
        const testimonialsContainer = document.getElementById('testimonialsContainer');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const initialItems = 6;
        let visibleItems = initialItems;

        // Função para criar um card de depoimento
        function createTestimonialCard(aluno) {
            const card = document.createElement('div');
            card.className = 'testimonial-card';

            card.innerHTML = `
                <div class="student-header">
                    <div class="student-avatar" style="background-image: url('${aluno.photo}')"></div>
                    <div class="student-info">
                        <div class="student-name">${aluno.name}</div>
                        <div class="student-id">ID: ${aluno.id}</div>
                        <img src="./assets/imgs/estrelas.svg" alt="">
                    </div>
                     <div class="logo" style="background-image: url('${logo}')"></div>
                </div>
                <p class="testimonial-text">${aluno.testimonial}</p>
                <span class="category-tag">${aluno.category}</span>
            `;

            return card;
        }

        // Função para exibir os depoimentos
        function displayTestimonials() {
            // Limpar o container
            testimonialsContainer.innerHTML = '';

            // Mostrar apenas os itens visíveis
            const testimonialsToShow = alunosData.slice(0, visibleItems);

            testimonialsToShow.forEach(aluno => {
                testimonialsContainer.appendChild(createTestimonialCard(aluno));
            });

            // Esconder o botão se todos os itens estiverem visíveis
            if (visibleItems >= alunosData.length) {
                loadMoreBtn.classList.add('hidden');
            } else {
                loadMoreBtn.classList.remove('hidden');
            }
        }

        // Event listener para o botão "Mostrar Mais"
        loadMoreBtn.addEventListener('click', () => {
            // Aumentar o número de itens visíveis
            visibleItems = Math.min(visibleItems + initialItems, alunosData.length);
            displayTestimonials();

            // Rolagem suave para o final da lista
            setTimeout(() => {
                loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        });

        // Exibir os primeiros depoimentos
        displayTestimonials();