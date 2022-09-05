const mineflayer = require("mineflayer") // Mineflayer 
const { pathfinder, Movements, goals: { GoalNear }, } = require("mineflayer-pathfinder") // Pathfinder, Pvp, Guard
const pvp = require("mineflayer-pvp").plugin // Pvp, Guard
const autoeat = require("mineflayer-auto-eat") // AutoEat
const armorManager = require("mineflayer-armor-manager") // ArmorManager
const toolPlugin = require('mineflayer-tool').plugin
const { goals } = require("mineflayer-pathfinder")
const collectBlock = require("mineflayer-collectblock").plugin // CollectBlock
const GoalBlock = goals.GoalBlock


// Puxar configurações do arquivo "config.json"
const config = require("./config.json")

// Criar Bot
function createBot() {
  var bot = mineflayer.createBot({
    username: config["bot-account"]["username"],
    password: config["bot-account"]["password"],
    auth: config["bot-account"]["type"],
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });





  // <---Spawn--->

  bot.once("spawn", () => {
    console.log(`\x1b[35m[BotLog]\x1b[33m ${config["bot-account"]["username"]} entrou no servidor \x1b[0m`)

    if (config.utils["auto-auth"].enabled) {
      console.log("\x1b[33m[INFO]\x1b[0m Módulo de autenticação automática iniciado")

      var password = config.utils["auto-auth"].password
      setTimeout(() => {
        bot.chat(`/register ${password} ${password}`)
        bot.chat(`/login ${password}`)
      }, 500);

      console.log("\x1b[32m[Auth]\x1b[0m Comandos de autenticação executados")
    }
  })

  // <---Position & Afk--->

  bot.once("spawn", () => {
    const pos = config.position

    if (config.position.enabled) {
      console.log(`\x1b[35m[BotLog]\x1b[32m Começando a se mover para o local de destino (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`)
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z))
    }

    if (config.utils["anti-afk"].enabled) {
      bot.setControlState("jump", true)
      if (config.utils["anti-afk"].sneak) {
        bot.setControlState("sneak", true)
      }
    }
  })

  bot.on("chat", (username, message) => {
    if (config.utils["chat-log"]) {
      console.log(`\x1b[35m[ChatLog]\x1b[33m <${username}>\x1b[0m ${message}`)
    }
  })

  bot.on("goal_reached", () => {
    console.log(`\x1b[35m[BotLog]\x1b[32m Bot chegou ao local de destino. ${bot.entity.position}\x1b[0m`)
  })



  // <---Mensagens--->

  bot.once("spawn", () => {
    if (config.utils["chat-messages"].enabled) {
      console.log("[INFO] Módulo de mensagens de bate-papo iniciado")
      var messages = config.utils["chat-messages"]["messages"]

      if (config.utils["chat-messages"].repeat) {
        var delay = config.utils["chat-messages"]["repeat-delay"]
        let i = 0

        setInterval(() => {
          bot.chat(`${messages[i]}`)

          if (i + 1 == messages.length) {
            i = 0
          } else i++
        }, delay * 1000)
      } else {
        messages.forEach((msg) => {
          bot.chat(msg)
        })
      }
    }
  })



  // <---AutoReconnect--->

  if (config.utils["auto-reconnect"]) {
    bot.on("end", () => {
      setTimeout(() => {
        createBot()
      }, config.utils["auto-recconect-delay"])
    })
  }



  // <---Pathfinder--->

const RANGE_GOAL = 1 // ficar dentro deste raio do jogador

bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    if (message !== 'come') return
    const target = bot.players[username]?.entity
    if (!target) {
      bot.chat("Não vejo você !")
      return
    }
    const { x: playerX, y: playerY, z: playerZ } = target.position

    defaultMove.canDig = true
    defaultMove.scafoldingBlocks.push(mcData.itemsByName['netherrack'].id)
    defaultMove.digCost = 1
    defaultMove.placeCost = 1
    defaultMove.maxDropDown = 4
    defaultMove.infiniteLiquidDropdownDistance = true
    defaultMove.liquidCost = 1
    defaultMove.entityCost = 1
    defaultMove.dontCreateFlow = true
    defaultMove.dontMineUnderFallingBlock = true
    defaultMove.allow1by1towers = true
    defaultMove.allowFreeMotion = false
    defaultMove.allowParkour = true
    defaultMove.allowSprinting = true
    defaultMove.allowEntityDetection = true
    bot.pathfinder.setMovements(defaultMove)
    bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, RANGE_GOAL))
  })
  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    if (message === 'stop') {
      bot.pathfinder.stop()
      }
})

})



  // <---Move--->



  // <---Pvp--->

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)

bot.on('chat', (username, message) => {
  if (message === 'fight me') {
    const player = bot.players[username]

    if (!player) {
      bot.chat("Não vejo você !")
      return
    }

    bot.pvp.attack(player.entity)
  }

  if (message === 'stop') {
    bot.pvp.stop()
  }
})



  // <---Guard--->

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)

let guardPos = null

// Atribua o local determinado a ser guardado
function guardArea (pos) {
  guardPos = pos

  // Nós não estamos atualmente em combate, passe para o posto de guarda
  if (!bot.pvp.target) {
    moveToGuardPos()
  }
}

// Cancele todos os desbravadores e combates
function stopGuarding () {
  guardPos = null
  bot.pvp.stop()
  bot.pathfinder.setGoal(null)
}

// Pathfinder para a posição de guarda
function moveToGuardPos () {
  const mcData = require('minecraft-data')(bot.version)
  bot.pathfinder.setMovements(new Movements(bot, mcData))
  bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
}

// Chamado quando o bot matou seu alvo
bot.on('stoppedAttacking', () => {
  if (guardPos) {
    moveToGuardPos()
  }
})

// Verifique se há novos inimigos para atacar
bot.on('physicsTick', () => {
  if (!guardPos) return // Não faça nada se o bot não estiver protegendo nada

  // Apenas procure por mobs dentro de 16 quarteirões
  const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
                    e.mobType !== 'Armor Stand' // Mojang classifica armaduras como mobs por algum motivo?

  const entity = bot.nearestEntity(filter)
  if (entity) {
    // Comece a atacar
    bot.pvp.attack(entity)
  }
})

// Ouça os comandos do jogador
bot.on('chat', (username, message) => {
  // Proteja o local em que o jogador está parado
  if (message === 'guard') {
    const player = bot.players[username]

    if (!player) {
      bot.chat("Não vejo você !")
      return
    }

    bot.chat('Eu vou proteger aquele local.')
    guardArea(player.entity.position)
  }

  // Pare de proteger 
  if (message === 'stop') {
    stopGuarding()
  }
})



  // <---AutoEat--->

bot.loadPlugin(autoeat)

bot.once("spawn", () => {
  bot.autoEat.options.priority = "foodPoints"
  bot.autoEat.options.bannedFood = []
  bot.autoEat.options.eatingTimeout = 3
})

// O bot come comida automaticamente e emite esses eventos quando começa a comer e para de comer.

bot.on("autoeat_started", () => {
  console.log(`${config["bot-account"]["username"]} começou a comer!`)
})

bot.on("autoeat_stopped", () => {
  console.log(`${config["bot-account"]["username"]} parou de comer!`)
})

bot.on("health", () => {
  if (bot.food === 20) bot.autoEat.disable()
  // Desative o plugin se o bot estiver em 20 pontos de comida
  else bot.autoEat.enable() // Caso contrário, habilite o plug-in novamente
})



  // <---AarmorManager--->

  if (config.ArmorManager["AutoEquip"]) {
    bot.loadPlugin(armorManager)
    bot.armorManager.equipAll()
  }



  // <---CollectBlock

bot.loadPlugin(collectBlock)

let mcData
bot.once('spawn', () => {
  mcData = require('minecraft-data')(bot.version)
})

bot.on('chat', async (username, message) => {
  const args = message.split(' ')
  if (args[0] !== 'collect') return

  let count = 1
  if (args.length === 3) count = parseInt(args[1])

  let type = args[1]
  if (args.length === 3) type = args[2]

  const blockType = mcData.blocksByName[type]
  if (!blockType) {
    return
  }

  const blocks = bot.findBlocks({
    matching: blockType.id,
    maxDistance: 128,
    count: count
  })

  if (blocks.length === 0) {
    bot.chat("Não vejo esse bloco por perto.")
    return
  }

  const targets = []
  for (let i = 0; i < Math.min(blocks.length, count); i++) {
    targets.push(bot.blockAt(blocks[i]))
  }

  bot.chat(`Encontrado ${targets.length} ${type}(s)`)

  try {
    await bot.collectBlock.collect(targets)
    // Todos os blocos foram coletados.
    bot.chat('Feito')
  } catch (err) {
    // Ocorreu um erro, denuncie.
    bot.chat(err.message)
    console.log(err)
  }
})



  // <---Tools--->

bot.loadPlugin(toolPlugin)

bot.on('spawn', async () => {
  const blockPos = bot.entity.position.offset(0, -1, 0)
  const block = bot.blockAt(blockPos)

  await bot.tool.equipForBlock(block, {})
  await bot.dig(block)
 })



  // <---Inventory--->

bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  const command = message.split(' ')
  switch (true) {
    case message === 'loaded':
      await bot.waitForChunksToLoad()
      bot.chat('Ready!')
      break
    case /^itens$/.test(message):
      sayyItems()
      break
    case /^toss \d+ \w+$/.test(message):
      // toss amount name
      // ex: toss 64 diamond
      tossItem(command[2], command[1])
      break
    case /^toss \w+$/.test(message):
      // toss name
      // ex: toss diamond
      tossItem(command[1])
      break
    case /^equip [\w-]+ \w+$/.test(message):
      // equip destination name
      // ex: equip hand diamond
      equipItem(command[2], command[1])
      break
    case /^unequip \w+$/.test(message):
      // unequip testination
      // ex: unequip hand
      unequipItem(command[1])
      break
    case /^use$/.test(message):
      useEquippedItem()
      break
    case /^craft \d+ \w+$/.test(message):
      // craft amount item
      // ex: craft 64 stick
      craftItem(command[2], command[1])
      break
  }
})

function sayyItems (items = null) {
  if (!items) {
    items = bot.inventory.items()
    if (require('minecraft-data')(bot.version).isNewerOrEqualTo('1.9') && bot.inventory.slots[45]) items.push(bot.inventory.slots[45])
  }
  const output = items.map(itemToString).join(', ')
  if (output) {
    bot.chat(output)
  } else {
    bot.chat('vazio')
  }
}

async function tossItem (name, amount) {
  amount = parseInt(amount, 10)
  const item = itemByName(name)
  if (!item) {
    bot.chat(`Eu não tenho ${name}`)
  } else {
    try {
      if (amount) {
        await bot.toss(item.type, null, amount)
        bot.chat(`jogou ${amount} x ${name}`)
      } else {
        await bot.tossStack(item)
        bot.chat(`jogou ${name}`)
      }
    } catch (err) {
      bot.chat(`incapaz de jogar: ${err.message}`)
    }
  }
}

async function equipItem (name, destination) {
  const item = itemByName(name)
  if (item) {
    try {
      await bot.equip(item, destination)
      bot.chat(`equipado ${name}`)
    } catch (err) {
      bot.chat(`não pode equipar ${name}: ${err.message}`)
    }
  } else {
    bot.chat(`Eu não tenho ${name}`)
  }
}

async function unequipItem (destination) {
  try {
    await bot.unequip(destination)
    bot.chat('desequipado')
  } catch (err) {
    bot.chat(`não pode desequipar: ${err.message}`)
  }
}

function useEquippedItem () {
  bot.chat('ativando item')
  bot.activateItem()
}

async function craftItem (name, amount) {
  amount = parseInt(amount, 10)
  const mcData = require('minecraft-data')(bot.version)

  const item = mcData.itemsByName[name]
  const craftingTableID = mcData.blocksByName.crafting_table.id

  const craftingTable = bot.findBlock({
    matching: craftingTableID
  })

  if (item) {
    const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
    if (recipe) {
      bot.chat(`eu posso fazer ${name}`)
      try {
        await bot.craft(recipe, amount, craftingTable)
        bot.chat(`fiz a receita para ${name} ${amount} times`)
      } catch (err) {
        bot.chat(`erro ao fazer ${name}`)
      }
    } else {
      bot.chat(`Eu não posso fazer ${name}`)
    }
  } else {
    bot.chat(`item desconhecido: ${name}`)
  }
}

function itemToString (item) {
  if (item) {
    return `${item.name} x ${item.count}`
  } else {
    return '(nothing)'
  }
}

function itemByName (name) {
  const items = bot.inventory.items()
  if (require('minecraft-data')(bot.version).isNewerOrEqualTo('1.9') && bot.inventory.slots[45]) items.push(bot.inventory.slots[45])
  return items.filter(item => item.name === name)[0]
}



  // <---WebViewer---> Desativado

//  if (config.web["bot-viewer"]) {
//    const mineflayerViewer = require("prismarine-viewer").mineflayer

//    bot.once("spawn", () => {
//      mineflayerViewer(bot, {
//        port: config.web["port-viewer"],
//        firstPerson: config.web["first-person"],
//        viewDistance: config.web["view-distance"],
//      });
//    console.log(`[WebViewer] http://localhost:${config.web["port-viewer"]}`)
//    });

//    bot.on("chat", (username, message) => {
//      if (message === "stop viewer") {
//        bot.chat('Visualização na web foi encerrada')
//        bot.viewer.close()
//      }
//    });
//  }



  // <---WebInventory--->

  if (config.web["inventory"]) {
    const inventoryViewer = require("mineflayer-web-inventory")

    bot.once("spawn", () => {
      inventoryViewer(bot, { port: config.web["port-inv"] })
        console.log(`[WebInventory] http://localhost:${config.web["port-inv"]}`)
    });

    bot.on("chat", (username, message) => {
      if (message === "stop inventory") {
        bot.chat('Inventario na web foi encerrado')
        bot.webInventory.stop()
      }

      if (message === "start inventory") {
        bot.webInventory.start()
      }
    });
  }



  // <---Dashboard--->

  if (config.Dashboard["enabled"]) {
    const mineflayerDashboard = require("mineflayer-dashboard")

    bot.loadPlugin(require("mineflayer-dashboard"))

    global.console.log = bot.dashboard.log
    global.console.error = bot.dashboard.log

    let lastUser = null;
    const whisper = new bot.dashboard.Mode("whisper", {
      bg: "blue",
      interpreter(string) {
        let words = string.split(" ")

        // Verifique se mudamos de receptor
        if (/ :to \w{3,16}$/.test(string)) {
          lastUser = words[words.length - 1]
          words = words.slice(0, -2)
        }

        // Registre um erro se não houver receptor
        if (lastUser === null) {
          return bot.dashboard.log("Nenhum receptor definido, adicione ' :to <user>' no final da mensagem")
        }

        // Enviar mensagem
        const message = words.join(" ");
        bot.chat(`/msg ${lastUser} ${message}`);
        this.println(`para ${lastUser}: ${message}`);
      },
      async completer(string) {
        // Estamos usando o minecraft completor já bem definido
        return bot.dashboard._minecraftCompleter(string);
      },
    });

    bot.dashboard.addMode(whisper);

    bot.on("whisper", (username, message) => {
      // Registre uma notificação se não estiver no modo sussurro
      if (bot.dashboard.mode !== whisper) {
        return bot.dashboard.log(`Você tem uma nova mensagem de ${username}`);
      }

      // Exibir mensagens no modo
      whisper.println(`${username}: ${message}`);
    });
  }



  // <---Sleep--->

    bot.on("chat", (username, message) => {
      if (username === bot.username) return
      switch (message) {
        case "sleep":
          goToSleep()
          break
        case "wake up":
          wakeUp()
          break
      }
    });

    bot.on("sleep", () => {
      bot.chat("Boa noite!")
    });
    bot.on("wake", () => {
      bot.chat("Bom Dia!")
    });

    async function goToSleep() {
      const bed = bot.findBlock({
        matching: (block) => bot.isABed(block),
      });
      if (bed) {
        try {
          await bot.sleep(bed)
          bot.chat("Estou dormindo")
        } catch (err) {
          bot.chat(`Eu não consigo dormir: ${err.message}`)
        }
      } else {
        bot.chat("Sem cama por perto")
      }
    }

    async function wakeUp() {
      try {
        await bot.wake()
      } catch (err) {
        bot.chat(`Eu não consigo acordar: ${err.message}`)
      }
    }



  // <---Attack--->

bot.on('spawn', () => {
  bot.on('chat', (username, message) => {
    if (message === 'attack me') attackPlayer(username)
    else if (message === 'attack') attackEntity()
  })
})

function attackPlayer (username) {
  const player = bot.players[username]
  if (!player || !player.entity) {
    bot.chat("Não vejo você !")
  } else {
    bot.chat(`Atacando ${player.username}`)
    bot.attack(player.entity)
  }
}

function attackEntity () {
  const entity = bot.nearestEntity()
  if (!entity) {
    bot.chat('Nenhuma entidade próxima')
  } else {
    bot.chat(`Atacando ${entity.name ?? entity.username}`)
    bot.attack(entity)
  }
}



  // <---Comandos--->

  bot.on("chat", (username, message) => {
    if (message === "help") {
      bot.chat(
        " [COMANDOS] : come, list, chest, furnace, dispenser, enchant, chestminecart, invsee, close, withdraw, deposit, input, take, ready, put, add lapis, loaded, dig, build, equip dirt, guard, stop guard, fight me, stop pvp, collect"
      );
    }

    if (message === "w") {
      bot.setControlState("forward", true)
    setTimeout(() => {
      bot.setControlState("forward", false)
    }, 230)
  }
    

    if (message === "s") {
      bot.setControlState("back", true)
    setTimeout(() => {
      bot.setControlState("back", false)
    }, 230)
  }

    if (message === "d") {
      bot.setControlState("left", true)
    setTimeout(() => {
      bot.setControlState("left", false)
    }, 230)
  }

    if (message === "a") {
      bot.setControlState("right", true)
    setTimeout(() => {
      bot.setControlState("right", false)
    }, 230)
  }

    if (message === "jump") {
      bot.setControlState("jump", true)
      bot.setControlState("jump", false)
    }

    if (message === "jump a lot") {
      bot.setControlState("jump", true)
    }

    if (message === "stop jumping") {
      bot.setControlState("jump", false)
    }

    if (message === "pos") {
      bot.chat(bot.entity.position.toString())
    }
  });



  // <---Chest--->

bot.once('inject_allowed', () => {
  mcData = require('minecraft-data')(bot.version)
})

bot.on('experience', () => {
  bot.chat(`Eu sou nível ${bot.experience.level}`)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  switch (true) {
    case /^list$/.test(message):
      sayItems()
      break
    case /^chest$/.test(message):
      watchChest(false, ['chest', 'ender_chest', 'trapped_chest'])
      break
    case /^furnace$/.test(message):
      watchFurnace()
      break
    case /^dispenser$/.test(message):
      watchChest(false, ['dispenser'])
      break
    case /^enchant$/.test(message):
      watchEnchantmentTable()
      break
    case /^chestminecart$/.test(message):
      watchChest(true)
      break
    case /^invsee \w+( \d)?$/.test(message): {
      // invsee Herobrine [or]
      // invsee Herobrine 1
      const command = message.split(' ')
      useInvsee(command[0], command[1])
      break
    }
  }
})

function sayItems (items = bot.inventory.items()) {
  const output = items.map(itemToString).join(', ')
  if (output) {
    bot.chat(output)
  } else {
    bot.chat('vazio')
  }
}

async function watchChest (minecart, blocks = []) {
  let chestToOpen
  if (minecart) {
    chestToOpen = Object.keys(bot.entities)
      .map(id => bot.entities[id]).find(e => e.entityType === mcData.entitiesByName.chest_minecart &&
      e.objectData.intField === 1 &&
      bot.entity.position.distanceTo(e.position) < 3)
    if (!chestToOpen) {
      bot.chat('nenhum minecart de baú encontrado')
      return
    }
  } else {
    chestToOpen = bot.findBlock({
      matching: blocks.map(name => mcData.blocksByName[name].id),
      maxDistance: 6
    })
    if (!chestToOpen) {
      bot.chat('nenhum baú encontrado')
      return
    }
  }
  const chest = await bot.openContainer(chestToOpen)
  sayItems(chest.containerItems())
  chest.on('updateSlot', (slot, oldItem, newItem) => {
    bot.chat(`atualização do peito: ${itemToString(oldItem)} -> ${itemToString(newItem)} (slot: ${slot})`)
  })
  chest.on('close', () => {
    bot.chat('peito fechado')
  })

  bot.on('chat', onChat)

  function onChat (username, message) {
    if (username === bot.username) return
    const command = message.split(' ')
    switch (true) {
      case /^close$/.test(message):
        closeChest()
        break
      case /^withdraw \d+ \w+$/.test(message):
        // withdraw amount name
        // ex: withdraw 16 stick
        withdrawItem(command[2], command[1])
        break
      case /^deposit \d+ \w+$/.test(message):
        // deposit amount name
        // ex: deposit 16 stick
        depositItem(command[2], command[1])
        break
    }
  }

  function closeChest () {
    chest.close()
    bot.removeListener('chat', onChat)
  }

  async function withdrawItem (name, amount) {
    const item = itemByName(chest.containerItems(), name)
    if (item) {
      try {
        await chest.withdraw(item.type, null, amount)
        bot.chat(`retirou-se ${amount} ${item.name}`)
      } catch (err) {
        bot.chat(`incapaz de retirar ${amount} ${item.name}`)
      }
    } else {
      bot.chat(`item desconhecido ${name}`)
    }
  }

  async function depositItem (name, amount) {
    const item = itemByName(chest.items(), name)
    if (item) {
      try {
        await chest.deposit(item.type, null, amount)
        bot.chat(`depositado ${amount} ${item.name}`)
      } catch (err) {
        bot.chat(`incapaz de depositar ${amount} ${item.name}`)
      }
    } else {
      bot.chat(`item desconhecido ${name}`)
    }
  }
}

async function watchFurnace () {
  const furnaceBlock = bot.findBlock({
    matching: ['furnace', 'lit_furnace'].filter(name => mcData.blocksByName[name] !== undefined).map(name => mcData.blocksByName[name].id),
    maxDistance: 6
  })
  if (!furnaceBlock) {
    bot.chat('nenhum forno encontrado')
    return
  }
  const furnace = await bot.openFurnace(furnaceBlock)
  let output = ''
  output += `input: ${itemToString(furnace.inputItem())}, `
  output += `fuel: ${itemToString(furnace.fuelItem())}, `
  output += `output: ${itemToString(furnace.outputItem())}`
  bot.chat(output)

  furnace.on('updateSlot', (slot, oldItem, newItem) => {
    bot.chat(`atualização do forno: ${itemToString(oldItem)} -> ${itemToString(newItem)} (slot: ${slot})`)
  })
  furnace.on('close', () => {
    bot.chat('forno fechado')
  })
  furnace.on('update', () => {
    console.log(`combustível: ${Math.round(furnace.fuel * 100)}% progresso: ${Math.round(furnace.progress * 100)}%`)
  })

  bot.on('chat', onChat)

  function onChat (username, message) {
    if (username === bot.username) return
    const command = message.split(' ')
    switch (true) {
      case /^close$/.test(message):
        closeFurnace()
        break
      case /^(input|fuel) \d+ \w+$/.test(message):
        // input amount name
        // ex: input 32 coal
        putInFurnace(command[0], command[2], command[1])
        break
      case /^take (input|fuel|output)$/.test(message):
        // take what
        // ex: take output
        takeFromFurnace(command[0])
        break
    }

    function closeFurnace () {
      furnace.close()
      bot.removeListener('chat', onChat)
    }

    async function putInFurnace (where, name, amount) {
      const item = itemByName(furnace.items(), name)
      if (item) {
        const fn = {
          input: furnace.putInput,
          fuel: furnace.putFuel
        }[where]
        try {
          await fn.call(furnace, item.type, null, amount)
          bot.chat(`colocar ${amount} ${item.name}`)
        } catch (err) {
          bot.chat(`incapaz de colocar ${amount} ${item.name}`)
        }
      } else {
        bot.chat(`item desconhecido ${name}`)
      }
    }

    async function takeFromFurnace (what) {
      const fn = {
        input: furnace.takeInput,
        fuel: furnace.takeFuel,
        output: furnace.takeOutput
      }[what]
      try {
        const item = await fn.call(furnace)
        bot.chat(`tomou ${item.name}`)
      } catch (err) {
        bot.chat('incapaz de tomar')
      }
    }
  }
}

async function watchEnchantmentTable () {
  const enchantTableBlock = bot.findBlock({
    matching: ['enchanting_table'].map(name => mcData.blocksByName[name].id),
    maxDistance: 6
  })
  if (!enchantTableBlock) {
    bot.chat('nenhuma mesa de encantamento encontrada')
    return
  }
  const table = await bot.openEnchantmentTable(enchantTableBlock)
  bot.chat(itemToString(table.targetItem()))

  table.on('updateSlot', (slot, oldItem, newItem) => {
    bot.chat(`atualização da tabela de encantamentos: ${itemToString(oldItem)} -> ${itemToString(newItem)} (slot: ${slot})`)
  })
  table.on('close', () => {
    bot.chat('mesa de encantamento fechada')
  })
  table.on('ready', () => {
    bot.chat(`pronto para encantar. escolhas são ${table.enchantments.map(o => o.level).join(', ')}`)
  })

  bot.on('chat', onChat)

  function onChat (username, message) {
    if (username === bot.username) return
    const command = message.split(' ')
    switch (true) {
      case /^close$/.test(message):
        closeEnchantmentTable()
        break
      case /^put \w+$/.test(message):
        // put name
        // ex: put diamondsword
        putItem(command[1])
        break
      case /^add lapis$/.test(message):
        addLapis()
        break
      case /^enchant \d+$/.test(message):
        // enchant choice
        // ex: enchant 2
        enchantItem(command[1])
        break
      case /^take$/.test(message):
        takeEnchantedItem()
        break
    }

    function closeEnchantmentTable () {
      table.close()
    }

    async function putItem (name) {
      const item = itemByName(table.window.items(), name)
      if (item) {
        try {
          await table.putTargetItem(item)
          bot.chat(`Eu coloco ${itemToString(item)}`)
        } catch (err) {
          bot.chat(`erro ao colocar ${itemToString(item)}`)
        }
      } else {
        bot.chat(`item desconhecido ${name}`)
      }
    }

    async function addLapis () {
      const item = itemByType(table.window.items(), ['dye', 'purple_dye', 'lapis_lazuli'].filter(name => mcData.itemByName[name] !== undefined)
        .map(name => mcData.itemByName[name].id))
      if (item) {
        try {
          await table.putLapis(item)
          bot.chat(`Eu coloco ${itemToString(item)}`)
        } catch (err) {
          bot.chat(`erro ao colocar ${itemToString(item)}`)
        }
      } else {
        bot.chat("não tenho lapis")
      }
    }

    async function enchantItem (choice) {
      choice = parseInt(choice, 10)
      try {
        const item = await table.enchant(choice)
        bot.chat(`encantado ${itemToString(item)}`)
      } catch (err) {
        bot.chat('encantamento de erros')
      }
    }

    async function takeEnchantedItem () {
      try {
        const item = await table.takeTargetItem()
        bot.chat(`pegou ${itemToString(item)}`)
      } catch (err) {
        bot.chat('erro ao obter item')
      }
    }
  }
}

function useInvsee (username, showEquipment) {
  bot.once('windowOpen', (window) => {
    const count = window.containerItems().length
    const what = showEquipment ? 'equipment' : 'inventory items'
    if (count) {
      bot.chat(`${username}'s ${what}:`)
      sayItems(window.containerItems())
    } else {
      bot.chat(`${username} não tem ${what}`)
    }
  })
  if (showEquipment) {
    // any extra parameter triggers the easter egg
    // and shows the other player's equipment
    bot.chat(`/invsee ${username} 1`)
  } else {
    bot.chat(`/invsee ${username}`)
  }
}

function itemToString (item) {
  if (item) {
    return `${item.name} x ${item.count}`
  } else {
    return '(nothing)'
  }
}

function itemByType (items, type) {
  let item
  let i
  for (i = 0; i < items.length; ++i) {
    item = items[i]
    if (item && item.type === type) return item
  }
  return null
}

function itemByName (items, name) {
  let item
  let i
  for (i = 0; i < items.length; ++i) {
    item = items[i]
    if (item && item.name === name) return item
  }
  return null
}



  // <---Console--->

  bot.on("death", () => {
    bot.emit("respawn")
    console.log(`\x1b[35m[BotLog]\x1b[32m ${config["bot-account"]["username"]} morreu e ressurgiu ${bot.entity.position}`, '\x1b[0m')
  });

  bot.on("kicked", (reason) => 
    console.log(`\x1b[35m[BotLog]\x1b[33m ${config["bot-account"]["username"]} foi expulso do servidor. Razão: ${reason}`, '\x1b[0m')
  );

  bot.on("error", (err) =>
    console.log(`\x1b[31m[ERROR] ${err.message}`, "\x1b[0m")
  );



  // <---DESLIGAR-BOT--->

  bot.on("chat", (username, message) => {
    if (message === "power off") {
      exit()
    }
  });

}
createBot()
