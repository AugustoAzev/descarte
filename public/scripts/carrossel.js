document.addEventListener("DOMContentLoaded", function() {
    const slideContainer = document.querySelector(".carrossel-slide");
    const images = slideContainer.querySelectorAll("img");
    const totalImages = images.length;
    let currentIndex = 0;

    function showNextImage() {
        currentIndex = (currentIndex + 1) % totalImages;
        slideContainer.style.transform = `translateX(-${currentIndex * 100}vw)`;
    }
    setInterval(showNextImage, 5000);
});
