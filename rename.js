// rename.js

function renamePermit(inputId, linkId) {
    const input = document.getElementById(inputId);
    const link = document.getElementById(`${linkId}-link`);

    if (input.value.trim() !== "") {
        link.textContent = input.value.trim();
        // link.href = `permits.html?permit=${input.value.trim().toLowerCase()}`;
    }
}
