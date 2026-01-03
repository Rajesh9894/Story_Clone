Instagram Stories Clone
A client-side implementation of Instagram's 24-hour Stories feature.

Features
Upload images that are automatically compressed

Stories expire after 24 hours

Responsive design for mobile and desktop

Swipe gestures to navigate between stories

Progress bar for current story

All data stored in browser's localStorage

Live Demo
[Add your deployment URL here]

Installation
Clone the repository:

bash
git clone https://github.com/Rajesh9894/Story_Clone.git
Open index.html in your browser or use a local server:

bash
# Using Python
python -m http.server 8000

# Using Node.js with http-server
npx http-server .
Usage
Click the "+" button to add a new story

Select an image from your device

View stories by clicking on them

Swipe left/right or use arrow keys to navigate between stories

Stories automatically disappear after 24 hours

Technical Details
Vanilla JavaScript (no frameworks)

LocalStorage for data persistence

Canvas API for image compression

CSS Flexbox for responsive layout

Touch events for swipe gestures

Project Structure
text
stories-clone/
├── index.html          # Main HTML file
├── styles.css         # All styles
├── script.js          # Main JavaScript application
└── README.md          # This file
Browser Support
Chrome 60+

Firefox 55+

Safari 11+

Edge 79+

License
MIT

Project URL: https://rajesh9894.github.io/Story_Clone/