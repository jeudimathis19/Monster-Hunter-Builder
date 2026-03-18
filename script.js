// Monster Hunter Wilds - Hunter Builder JavaScript

const API_URL = '/api';

// DOM Elements
const builderForm = document.getElementById('builderForm');
const buildsList = document.getElementById('buildsList');
const favoritesList = document.getElementById('favoritesList');

// Load favorites on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
});

// Handle form submission - generate builds
builderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const preferences = {
    level: parseInt(document.getElementById('level').value),
    weapon: document.getElementById('weapon').value,
    playstyle: document.getElementById('playstyle').value || null,
    element: document.getElementById('element').value || null,
    priority: document.getElementById('priority').value || 'damage'
  };

  // Generate builds based on preferences
  const builds = generateBuilds(preferences);
  
  // Display builds
  displayBuilds(builds, preferences);
});

// Generate builds based on preferences
function generateBuilds(preferences) {
  const builds = [];
  const weapon = preferences.weapon;
  const playstyle = preferences.playstyle || 'Equilibre';
  const element = preferences.element || 'Fire';
  const priority = preferences.priority;

  // Define armor pieces for each weapon type
  const armorSets = getArmorSets(weapon, playstyle, element, priority);
  
  // Generate 3 different builds
  for (let i = 0; i < 3; i++) {
    const build = {
      id: `${weapon}-${playstyle}-${element}-${priority}-${i}`,
      name: `${getBuildName(weapon, playstyle)} #${i + 1}`,
      type: getBuildType(playstyle, priority),
      weapon: getWeaponRecommendation(weapon, element),
      armor: armorSets[i % armorSets.length],
      stats: getStats(weapon, playstyle, priority, preferences.level),
      preferences: preferences
    };
    builds.push(build);
  }

  return builds;
}

function getArmorSets(weapon, playstyle, element, priority) {
  const baseArmorSets = [
    {
      head: `Masque ${element} alpha`,
      chest: `Plastron ${element} alpha`,
      arms: `Bras ${element} alpha`,
      waist: `Ceinture ${element} alpha`,
      legs: `Jambières ${element} alpha`
    },
    {
      head: `Casque ${playstyle} bêta`,
      chest: `Cuirasse ${playstyle} bêta`,
      arms: `Gants ${playstyle} bêta`,
      waist: `Taille ${playstyle} bêta`,
      legs: `Bottes ${playstyle} bêta`
    },
    {
      head: `Couronne ${priority} gamma`,
      chest: `Thorax ${priority} gamma`,
      arms: `Avant-bras ${priority} gamma`,
      waist: `Hanches ${priority} gamma`,
      legs: `Talons ${priority} gamma`
    }
  ];

  return baseArmorSets;
}

function getWeaponRecommendation(weapon, element) {
  const weapons = {
    'Great Sword': `Épée longue ${element} Tix`,
    'Long Sword': `Katana ${element} Namielle`,
    'Sword & Shield': `Dagues ${element} Kulu`,
    'Dual Blades': `Lames jumelles ${element} Tigrex`,
    'Hammer': `Marteau ${element} Brachydios`,
    'Hunting Horn': `Cor ${element} Barioth`,
    'Lance': `Lance ${element} Zinogre`,
    'Gunlance': `Canon lanceur ${element} Rajang`,
    'Switch Axe': `Hache wechsel ${element} Diablos`,
    'Charge Blade': `Lame charge ${element} Nargacuga`,
    'Insect Glaive': `Glaive insecte ${element} Valstrax`,
    'Bow': `Arc ${element} Kushala`,
    'Heavy Bowgun': `Arbalète lourde ${element} Safi`,
    'Light Bowgun': `Arbalète légère ${element} Teostra`
  };
  return weapons[weapon] || `Arme ${element} recommandée`;
}

function getBuildName(weapon, playstyle) {
  const names = {
    'Great Sword': 'Grande Épée',
    'Long Sword': 'Épée Longue',
    'Sword & Shield': 'Épee-Bouclier',
    'Dual Blades': 'Lames Doubles',
    'Hammer': 'Marteau',
    'Hunting Horn': 'Cor de Chasse',
    'Lance': 'Lance',
    'Gunlance': 'Lancecanon',
    'Switch Axe': 'Morpho-hache',
    'Charge Blade': 'Volto-hache',
    'Insect Glaive': 'Insectoglaive',
    'Bow': 'Arc',
    'Heavy Bowgun': 'Fusarbalète Lourde',
    'Light Bowgun': 'Fusarbalète Légère'
  };
  return `${names[weapon]} ${playstyle}`;
}

function getBuildType(playstyle, priority) {
  return `${playstyle} - ${priority}`;
}

function getStats(weapon, playstyle, priority, level) {
  // Scale stats based on level
  const levelMultiplier = Math.min(level / 100, 1);
  
  let baseAttack = 100 + (weapon === 'Great Sword' ? 50 : 30);
  let baseDefense = 50;
  let baseAffinity = 0;
  let baseElement = 0;

  // Adjust based on playstyle
  if (playstyle === 'Agression') {
    baseAttack += 30;
    baseAffinity += 15;
    baseDefense -= 10;
  } else if (playstyle === 'Defensif') {
    baseDefense += 40;
    baseAttack -= 15;
  } else if (playstyle === 'Technique') {
    baseAffinity += 25;
    baseAttack += 10;
  } else if (playstyle === 'Support') {
    baseDefense += 15;
    // Would add status effects in full implementation
  }

  // Adjust based on priority
  if (priority === 'damage') {
    baseAttack += 20;
  } else if (priority === 'survivability') {
    baseDefense += 30;
  } else if (priority === 'status') {
    baseAffinity += 10;
  }

  // Apply level scaling
  baseAttack = Math.floor(baseAttack * (1 + levelMultiplier * 0.5));
  baseDefense = Math.floor(baseDefense * (1 + levelMultiplier * 0.3));

  return {
    attack: baseAttack,
    defense: baseDefense,
    affinity: Math.min(baseAffinity + 10, 100),
    element: weapon.includes('Bow') || weapon.includes('Bowgun') ? 'Variable' : '+15'
  };
}

// Display generated builds
function displayBuilds(builds, preferences) {
  buildsList.innerHTML = builds.map(build => createBuildCard(build, preferences)).join('');
  
  // Add event listeners for favorite buttons
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn, build));
  });
}

function createBuildCard(build, preferences) {
  return `
    <div class="build-card" data-build-id="${build.id}">
      <div class="build-header">
        <span class="build-name">${build.name}</span>
        <span class="build-type">${build.type}</span>
      </div>
      
      <div class="build-weapon">${build.weapon}</div>
      
      <div class="build-stats">
        <div class="stat-item">
          <span class="stat-label">Attaque</span>
          <span class="stat-value high">${build.stats.attack}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Défense</span>
          <span class="stat-value">${build.stats.defense}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Affinité</span>
          <span class="stat-value">${build.stats.affinity}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Élément</span>
          <span class="stat-value">${build.stats.element}</span>
        </div>
      </div>
      
      <div class="build-armor">
        <div class="armor-piece">🪖 ${build.armor.head}</div>
        <div class="armor-piece">👕 ${build.armor.chest}</div>
        <div class="armor-piece">🧤 ${build.armor.arms}</div>
        <div class="armor-piece">👖 ${build.armor.waist}</div>
        <div class="armor-piece">👢 ${build.armor.legs}</div>
      </div>
      
      <button class="fav-btn" onclick="toggleFavorite(this, ${JSON.stringify(build).replace(/"/g, '"')})">
        ♡ Ajouter aux favoris
      </button>
    </div>
  `;
}

// Toggle favorite
async function toggleFavorite(btn, build) {
  const isFavorited = btn.classList.contains('favorited');
  
  if (isFavorited) {
    // Remove from favorites
    try {
      const response = await fetch(`${API_URL}/favorites/${encodeURIComponent(build.id)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        btn.classList.remove('favorited');
        btn.innerHTML = '♡ Ajouter aux favoris';
        loadFavorites();
        showNotification('Build retiré des favoris', 'success');
      }
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error');
    }
  } else {
    // Add to favorites
    try {
      const response = await fetch(`${API_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(build)
      });
      
      if (response.ok) {
        btn.classList.add('favorited');
        btn.innerHTML = '★ Favori';
        loadFavorites();
        showNotification('Build ajouté aux favoris!', 'success');
      }
    } catch (error) {
      showNotification('Erreur lors de l\'ajout', 'error');
    }
  }
}

// Load favorites
async function loadFavorites() {
  try {
    const response = await fetch(`${API_URL}/favorites`);
    const favorites = await response.json();
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<div class="empty-state"><p>Aucun favori enregistré</p></div>';
      return;
    }
    
    favoritesList.innerHTML = favorites.map(fav => createFavoriteCard(fav)).join('');
    
    // Update button states if build is in favorites
    updateFavoriteButtons(favorites);
  } catch (error) {
    favoritesList.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des favoris</p></div>';
  }
}

function createFavoriteCard(fav) {
  return `
    <div class="favorite-card">
      <div class="build-header">
        <span class="build-name">${fav.name}</span>
        <span class="build-type">${fav.type}</span>
      </div>
      
      <div class="build-weapon">${fav.weapon}</div>
      
      <div class="build-stats">
        <div class="stat-item">
          <span class="stat-label">Attaque</span>
          <span class="stat-value high">${fav.stats.attack}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Défense</span>
          <span class="stat-value">${fav.stats.defense}</span>
        </div>
      </div>
      
      <button class="fav-btn favorited" onclick="removeFavorite('${fav.id}', this)">
        ★ Retirer des favoris
      </button>
    </div>
  `;
}

function updateFavoriteButtons(favorites) {
  const favoriteIds = favorites.map(f => f.id);
  document.querySelectorAll('.build-card .fav-btn').forEach(btn => {
    const buildId = btn.closest('.build-card').dataset.buildId;
    if (favoriteIds.includes(buildId)) {
      btn.classList.add('favorited');
      btn.innerHTML = '★ Favori';
    }
  });
}

async function removeFavorite(id, btn) {
  try {
    const response = await fetch(`${API_URL}/favorites/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadFavorites();
      showNotification('Build retiré des favoris', 'success');
    }
  } catch (error) {
    showNotification('Erreur lors de la suppression', 'error');
  }
}

// Show notification
function showNotification(message, type) {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 2000;
    animation: slideIn 0.3s ease;
    ${type === 'success' 
      ? 'background: linear-gradient(135deg, #1a5c2e, #0d3d1e); border: 1px solid #2ecc71; color: #fff;' 
      : 'background: linear-gradient(135deg, #5c1a1a, #3d0d0d); border: 1px solid #e74c3c; color: #fff;'}
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
