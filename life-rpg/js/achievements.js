function renderAchievements(state) {
  const grid = document.getElementById('achievement-grid');
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = state.achievements.includes(a.id);
    return `
      <div class="badge ${unlocked ? 'unlocked' : 'locked'}" title="${unlocked ? a.desc : '？？？'}">
        <div class="badge-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="badge-name">${unlocked ? a.name : '未解鎖'}</div>
      </div>
    `;
  }).join('');
}
