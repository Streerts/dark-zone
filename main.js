const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a2a1a',
  scene: { preload, create, update },
  physics: { default: 'arcade' }
};

const game = new Phaser.Game(config);

const XP_TABLE = [0, 0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363, 14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224, 41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333, 111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742, 302288, 333804, 368599, 407015, 449428, 496254, 547953, 605032, 668051, 737627, 814445, 899257, 992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068, 2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 5346332, 5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606, 13034431];

function getLevel(xp) {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) if (xp >= XP_TABLE[i]) return i;
  return 1;
}

let player, cursors, keys;
let inventory = {};
let skills = { woodcutting: 0, mining: 0, fishing: 0, foraging: 0, attack: 0 };
let nodes = [];
let invText, skillText;

function preload() {}

function create() {
  const biomes = [
    { name: 'forest', x: 0, y: 0, w: 800, h: 600, color: 0x2d5a27, resources: ['tree', 'oak', 'herb'] },
    { name: 'desert', x: 800, y: 0, w: 800, h: 600, color: 0xc2b280, resources: ['cactus', 'tin', 'rock'] },
    { name: 'swamp', x: 0, y: 600, w: 800, h: 600, color: 0x3a4a2a, resources: ['mushroom', 'pike', 'herb'] },
    { name: 'snow', x: 800, y: 600, w: 800, h: 600, color: 0xe8f0f8, resources: ['birch', 'crystal', 'fish'] },
    { name: 'cave', x: 1600, y: 300, w: 600, h: 600, color: 0x2a2a3a, resources: ['mithril', 'crystal', 'spider'] }
  ];

  biomes.forEach(b => {
    const g = this.add.graphics();
    g.fillStyle(b.color, 1);
    g.fillRect(b.x, b.y, b.w, b.h);
    g.lineStyle(4, 0x000000, 0.3);
    g.strokeRect(b.x, b.y, b.w, b.h);
    this.add.text(b.x + 20, b.y + 20, b.name.toUpperCase(), { fontSize: '18px', color: '#fff', backgroundColor: '#00000088' });

    for (let i = 0; i < 8; i++) {
      const rx = b.x + 80 + Math.random() * (b.w - 160);
      const ry = b.y + 80 + Math.random() * (b.h - 160);
      const resType = b.resources[Math.floor(Math.random() * b.resources.length)];
      spawnNode.call(this, rx, ry, resType);
    }
  });

  player = this.add.rectangle(400, 300, 24, 24, 0x44aa44);
  this.physics.add.existing(player);

  this.cameras.main.startFollow(player, true, 0.1, 0.1);
  this.cameras.main.setBounds(-200, -200, 2600, 1400);

  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D');

  this.add.text(10, 10, 'Dark Zone', { fontSize: '20px', color: '#fff', backgroundColor: '#000000aa' }).setScrollFactor(0);
  invText = this.add.text(10, 40, '', { fontSize: '14px', color: '#fff', backgroundColor: '#000000aa' }).setScrollFactor(0);
  skillText = this.add.text(10, 70, '', { fontSize: '14px', color: '#fff', backgroundColor: '#000000aa' }).setScrollFactor(0);
  updateUI();

  this.input.on('pointerdown', (pointer) => {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let hit = false;
    nodes.forEach(n => {
      if (Phaser.Math.Distance.Between(world.x, world.y, n.x, n.y) < 40) {
        interact.call(this, n);
        hit = true;
      }
    });
    if (!hit) this.physics.moveTo(player, world.x, world.y, 180);
  });

  this.add.text(10, this.scale.height - 40, 'WASD/Arrows move | Click to move or gather | Biomes: Forest Desert Swamp Snow Cave', { fontSize: '12px', color: '#aaa' }).setScrollFactor(0);
}

function spawnNode(x, y, type) {
  const colors = { tree: 0x228b22, oak: 0x2e8b57, herb: 0x32cd32, cactus: 0x228b22, tin: 0x808080, rock: 0x696969, mushroom: 0x8b4513, pike: 0x4682b4, fish: 0x1e90ff, birch: 0xf5f5f5, crystal: 0x00ffff, mithril: 0x00ced1, spider: 0x8b0000 };
  const node = this.add.rectangle(x, y, 28, 28, colors[type] || 0x888888);
  node.setStrokeStyle(2, 0x000000);
  node.type = type;
  node.charges = 3;
  this.add.text(x - 14, y + 16, type, { fontSize: '10px', color: '#fff' });
  nodes.push(node);
}

function interact(node) {
  const skillMap = { tree: 'woodcutting', oak: 'woodcutting', birch: 'woodcutting', tin: 'mining', rock: 'mining', mithril: 'mining', crystal: 'mining', fish: 'fishing', pike: 'fishing', herb: 'foraging', mushroom: 'foraging', cactus: 'foraging', spider: 'attack' };
  const skill = skillMap[node.type] || 'woodcutting';
  if (node.charges <= 0) return;
  skills[skill] = (skills[skill] || 0) + 25;
  inventory[node.type] = (inventory[node.type] || 0) + 1;
  node.charges--;
  if (node.charges <= 0) node.setAlpha(0.3);
  updateUI();
  const txt = this.add.text(node.x, node.y - 20, '+25 ' + skill + ' XP', { fontSize: '12px', color: '#ffff00' });
  this.tweens.add({ targets: txt, y: node.y - 40, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
}

function updateUI() {
  invText.setText('Inv: ' + Object.entries(inventory).map(([k,v]) => k+':'+v).join(' '));
  skillText.setText('WC:'+getLevel(skills.woodcutting)+' Mine:'+getLevel(skills.mining)+' Fish:'+getLevel(skills.fishing)+' Forage:'+getLevel(skills.foraging));
}

function update() {
  const speed = 160;
  player.body.setVelocity(0);
  if (cursors.left.isDown || keys.A.isDown) player.body.setVelocityX(-speed);
  else if (cursors.right.isDown || keys.D.isDown) player.body.setVelocityX(speed);
  if (cursors.up.isDown || keys.W.isDown) player.body.setVelocityY(-speed);
  else if (cursors.down.isDown || keys.S.isDown) player.body.setVelocityY(speed);
}

window.addEventListener('resize', () => game.scale.resize(window.innerWidth, window.innerHeight));
