document.addEventListener('DOMContentLoaded', () => {
  const changeAvatarButton = document.getElementById('change-avatar');
  const avatarOptions = document.getElementById('avatar-options');

  if (changeAvatarButton) {
    changeAvatarButton.addEventListener('click', () => {
      avatarOptions.style.display = avatarOptions.style.display === 'none' ? 'flex' : 'none';
  });
}

  document.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', () => {
      const avatarPath = option.getAttribute('data-path');
      const userId = document.getElementById('user-data').getAttribute('data-user-id');

      fetch('/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, avatarPath }),
      })
        .then(response => response.text())
        .then(message => {

          document.getElementById('user-avatar').src = avatarPath;

          avatarOptions.style.display = 'none';
        })
        .catch(err => console.error('Erro ao atualizar o avatar:', err));
    });
  });
});