// Use const and let for variable declarations
const tapButton = document.querySelector(".tap-button");
const resetButton = document.querySelector(".left-nav-button");
const countLabel = document.querySelector(".count.label");
let count = 0;

// Use meaningful function names
function incrementCounter() {
	count++;
	updateCounterDisplay();
}

function resetCounter() {
	count = 0;
	updateCounterDisplay();
}

function updateCounterDisplay() {
	countLabel.innerHTML = count;
}

// Use addEventListener consistently
tapButton.addEventListener("click", incrementCounter);
resetButton.addEventListener("click", resetCounter);

//-----------------------   Adjust the button text based on the screen size.   -----------------------

// Get the element by its ID
var interactionTextElement = document.getElementById("interactionText");

// Check the screen width and set the text accordingly
function setTextBasedOnScreenSize() {
	if (window.innerWidth <= 700) {
		interactionTextElement.textContent = "Tap";
	} else {
		interactionTextElement.textContent = "Click";
	}
}

// Set the initial text when the page loads
setTextBasedOnScreenSize();

// Add an event listener to handle resizing
window.addEventListener("resize", setTextBasedOnScreenSize);
