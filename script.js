// Story Manager
class StoryManager {
    constructor() {
        this.stories = this.loadStories();
        this.expiredCheckInterval = null;
        this.initExpiredCheck();
    }
    
    loadStories() {
        try {
            const storiesJSON = localStorage.getItem('instagram_stories');
            if (storiesJSON) {
                const storiesData = JSON.parse(storiesJSON);
                return storiesData.map(data => ({
                    id: data.id,
                    imageData: data.imageData,
                    username: data.username || 'You',
                    timestamp: data.timestamp,
                    expiresAt: data.expiresAt || data.timestamp + (24 * 60 * 60 * 1000)
                })).filter(story => Date.now() < story.expiresAt);
            }
        } catch (error) {
            console.error('Error loading stories:', error);
        }
        return [];
    }
    
    saveStories() {
        try {
            localStorage.setItem('instagram_stories', JSON.stringify(this.stories));
        } catch (error) {
            console.error('Error saving stories:', error);
        }
    }
    
    addStory(imageData, username = 'You') {
        const story = {
            id: Date.now().toString(),
            imageData: imageData,
            username: username,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        this.stories.push(story);
        this.saveStories();
        this.scheduleRemoval(story.id);
        return story;
    }
    
    removeStory(id) {
        this.stories = this.stories.filter(story => story.id !== id);
        this.saveStories();
    }
    
    getStory(id) {
        return this.stories.find(story => story.id === id);
    }
    
    scheduleRemoval(id) {
        const story = this.getStory(id);
        if (story) {
            const timeLeft = story.expiresAt - Date.now();
            if (timeLeft > 0) {
                setTimeout(() => {
                    this.removeStory(id);
                    renderStories();
                }, timeLeft);
            }
        }
    }
    
    initExpiredCheck() {
        // Check for expired stories every 5 minutes
        this.expiredCheckInterval = setInterval(() => {
            const initialCount = this.stories.length;
            this.stories = this.stories.filter(story => Date.now() < story.expiresAt);
            if (this.stories.length !== initialCount) {
                this.saveStories();
                renderStories();
            }
        }, 5 * 60 * 1000);
    }
    
    formatTimeLeft(expiresAt) {
        const timeLeft = expiresAt - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

// Image Processor
class ImageProcessor {
    constructor() {
        this.maxWidth = 1080;
        this.maxHeight = 1920;
    }
    
    processImage(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.match('image.*')) {
                reject(new Error('Please select an image file'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = this.calculateDimensions(img.width, img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with JPEG compression
                    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(base64Image);
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = event.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    calculateDimensions(originalWidth, originalHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        // Scale down if exceeds max dimensions
        if (width > this.maxWidth || height > this.maxHeight) {
            const ratio = Math.min(this.maxWidth / width, this.maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        return { width, height };
    }
}

// App State
const storyManager = new StoryManager();
const imageProcessor = new ImageProcessor();
let currentStoryIndex = -1;
let progressInterval = null;
let selectedImage = null;

// DOM Elements
const storiesContainer = document.getElementById('storiesContainer');
const storyViewer = document.getElementById('storyViewer');
const uploadModal = document.getElementById('uploadModal');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const cancelBtn = document.getElementById('cancelBtn');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const notification = document.getElementById('notification');

// Initialize App
function initApp() {
    renderStories();
    setupEventListeners();
}

// Render Stories
function renderStories() {
    storiesContainer.innerHTML = '';
    
    // Add new story button
    const newStoryItem = createStoryElement(null, true);
    storiesContainer.appendChild(newStoryItem);
    
    // Add existing stories
    storyManager.stories.forEach((story, index) => {
        const storyElement = createStoryElement(story, false);
        storiesContainer.appendChild(storyElement);
    });
    
    // If no stories, show message
    if (storyManager.stories.length === 0) {
        const noStories = document.createElement('div');
        noStories.className = 'no-stories-message';
        noStories.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
                <p>No stories yet. Add your first story!</p>
            </div>
        `;
        storiesContainer.appendChild(noStories);
    }
}

// Create Story Element
function createStoryElement(story, isNew) {
    const storyItem = document.createElement('div');
    storyItem.className = 'story-item';
    
    if (isNew) {
        storyItem.innerHTML = `
            <div class="story-circle new-story">➕</div>
            <div class="story-username">Add Story</div>
        `;
        storyItem.addEventListener('click', openUploadModal);
    } else {
        const timeLeft = storyManager.formatTimeLeft(story.expiresAt);
        storyItem.innerHTML = `
            <div class="story-circle">
                <img src="${story.imageData}" alt="${story.username}'s story" class="story-image">
            </div>
            <div class="story-username">${story.username}</div>
            <div class="story-time">${timeLeft} left</div>
        `;
        storyItem.addEventListener('click', () => openStoryViewer(story.id));
    }
    
    return storyItem;
}

// Open Story Viewer
function openStoryViewer(storyId) {
    const story = storyManager.getStory(storyId);
    if (!story) {
        showNotification('Story not found');
        return;
    }
    
    currentStoryIndex = storyManager.stories.findIndex(s => s.id === storyId);
    
    const viewerContent = storyViewer.querySelector('.story-viewer-content');
    viewerContent.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>
        <div class="viewer-controls">
            <button class="close-btn" id="closeViewer">✖</button>
            <div class="story-info">${story.username} • ${storyManager.formatTimeLeft(story.expiresAt)} left</div>
        </div>
        <img src="${story.imageData}" alt="Story" class="story-display">
    `;
    
    storyViewer.classList.remove('hidden');
    startStoryProgress(story);
    setupViewerControls(storyId);
}

// Start Story Progress
function startStoryProgress(story) {
    clearInterval(progressInterval);
    
    const progressFill = document.getElementById('progressFill');
    if (!progressFill) return;
    
    const duration = 5000; // 5 seconds per story
    let startTime = Date.now();
    
    progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        progressFill.style.width = `${progress}%`;
        
        if (progress >= 100) {
            nextStory();
        }
    }, 50);
}

// Setup Viewer Controls
function setupViewerControls(storyId) {
    const closeBtn = document.getElementById('closeViewer');
    const viewerContent = storyViewer.querySelector('.story-viewer-content');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStoryViewer);
    }
    
    // Touch events for swipe
    let touchStartX = 0;
    
    viewerContent.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });
    
    viewerContent.addEventListener('touchend', (e) => {
        if (!touchStartX) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX - touchEndX;
        
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                nextStory();
            } else {
                previousStory();
            }
        }
        
        touchStartX = 0;
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleViewerKeydown);
}

// Handle Viewer Keyboard Navigation
function handleViewerKeydown(e) {
    if (storyViewer.classList.contains('hidden')) return;
    
    switch (e.key) {
        case 'ArrowRight':
        case ' ':
            e.preventDefault();
            nextStory();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            previousStory();
            break;
        case 'Escape':
            e.preventDefault();
            closeStoryViewer();
            break;
    }
}

// Navigate Stories
function nextStory() {
    if (currentStoryIndex < storyManager.stories.length - 1) {
        currentStoryIndex++;
        openStoryViewer(storyManager.stories[currentStoryIndex].id);
    } else {
        closeStoryViewer();
    }
}

function previousStory() {
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        openStoryViewer(storyManager.stories[currentStoryIndex].id);
    }
}

// Close Story Viewer
function closeStoryViewer() {
    clearInterval(progressInterval);
    storyViewer.classList.add('hidden');
    document.removeEventListener('keydown', handleViewerKeydown);
}

// Open Upload Modal
function openUploadModal() {
    uploadModal.classList.remove('hidden');
    resetUploadForm();
}

// Reset Upload Form
function resetUploadForm() {
    selectedImage = null;
    imagePreview.classList.add('hidden');
    uploadBtn.classList.add('hidden');
    previewImage.src = '';
    uploadArea.classList.remove('drag-over');
}

// Setup Event Listeners
function setupEventListeners() {
    // File input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        uploadModal.classList.add('hidden');
    });
    
    // Upload button
    uploadBtn.addEventListener('click', uploadStory);
    
    // Close modals on outside click
    [storyViewer, uploadModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal === storyViewer) {
                    closeStoryViewer();
                } else {
                    modal.classList.add('hidden');
                }
            }
        });
    });
}

// Handle File Selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Show loading state
        uploadArea.innerHTML = '<div class="upload-icon">⏳</div><p>Processing image...</p>';
        
        const imageData = await imageProcessor.processImage(file);
        selectedImage = imageData;
        
        // Show preview
        previewImage.src = imageData;
        imagePreview.classList.remove('hidden');
        uploadBtn.classList.remove('hidden');
        
        // Reset upload area
        uploadArea.innerHTML = `
            <div class="upload-icon">📤</div>
            <p>Click here to select an image</p>
            <p class="upload-hint">Max size: 1080x1920px</p>
        `;
        
        showNotification('Image ready for upload!');
    } catch (error) {
        showNotification(error.message);
        resetUploadForm();
    }
}

// Upload Story
function uploadStory() {
    if (!selectedImage) {
        showNotification('Please select an image first');
        return;
    }
    
    try {
        const story = storyManager.addStory(selectedImage);
        showNotification('Story added successfully!');
        
        uploadModal.classList.add('hidden');
        renderStories();
    } catch (error) {
        showNotification('Failed to upload story');
    }
}

// Show Notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);