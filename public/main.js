const modal = document.querySelector('.modal');

const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    
    if (modal) {
        modal.classList.add('visible');
    }
}

const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);

    if (modal) {
        modal.classList.remove('visible');
    }
}

// Event listeners for opening modals:
document.getElementById('addWordBtn').addEventListener('click', () => openModal('addWordModal'));
document.getElementById('practiceWordsBtn').addEventListener('click', () => openModal('practiceModal'));
document.getElementById('editBtn').addEventListener('click', () => openModal('editModal'));
document.getElementById('practiceWordBtn').addEventListener('click', () => openModal('practiceWordModal'));

// Event listeners for closing modals:
document.querySelectorAll('.close-modal').forEach((closeButton) => {
    closeButton.addEventListener('click', () => {
        const modal = closeButton.closest('.modal'); // Find the closest .modal element

        if (modal) {
            modal.classList.remove('visible');
        }
    });
});

// Event listeners for clicking outside the modal content to close the modal:
document.querySelectorAll('.modal .modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
        const modal = backdrop.closest('.modal');
        if (modal) {
            modal.classList.remove('visible');
        }
    });
});