/**
 * Функции - адаптеры для rpi
 */
const util = require('util');

const pref = "GPIO";


module.exports = {
  // Передать в командной строке входы и выходы:  5=U,7=D 22=1,20=0
  getArgs: function (unit, houser) {
    // Получить все каналы для rpi
    let chans = houser.jdbGet({
      name: "devhard",
      filter: { unit }
    });

    let chans = houser.pp.getUnitChannels(unit);
    if (chans.length <= 0) throw { message: "No channels for "+unit+"!" };

    let links = houser.jdbGet({ name: "devhard", filter: { unit }});
  
    let ioSet = buildIoSet(chans);
    let dnSet = buildDnSet(links);

    let argsArr = [];
    let inarr = [];
    let outarr = [];
    Object.keys(ioSet).forEach(io => {
      switch (ioSet[io]) {
        case "IN_UP":
          inarr.push(chanToPin(io) + "=U");
          break;
        case "IN_DN":
          inarr.push(chanToPin(io) + "=D");
          break;

        case "OUT":
          // Здесь надо вернуть текущее значение, т к это потенциальный выход - найти устройство
          // Если устройства нет - сбросить в 0
          let val = 0;
          if (dnSet[io]) {
            let dobj = houser.getDevobj(dnSet[io]);
            val = dobj ? dobj.dval : 0;
          } 
          outarr.push(chanToPin(io) + "=" + val);
          break;

        case "OUT_PULSE":
          // Импульсные всегда в 0
          outarr.push(chanToPin(io) + "=0");
          break;   
          
      }
    });

    argsArr.push(inarr.join(","));
    argsArr.push(outarr.join(","));
    return argsArr;
  },

  // RPI?5=1 =>  {type:data, data:[{id:xx, value:yy}]}
  readTele: function (tele, houser) {
    if (!tele || tele.length < 5) return;

    let arr = tele.substr(4).split("=");
    if (arr && arr.length == 2) {
      return { type: "data", data: [{ id: pinToChan(arr[0]), value: arr[1] }] };
    }
  },

  // { type: 'act', data:[{id:xx, value:yy}] } => RPI?20=1&21=0
  formTele: function (mes, houser) {
    let arr = [];

    if (mes && mes.data && mes.data.length > 0) {
      mes.data.forEach(item => {
        let value;
        if (item.command == 'on') value = 1;
        if (item.command == 'off') value = 0;

        arr.push(chanToPin(item.chan) + "=" + value);
      });
      if (arr.length > 0) return "RPI?" + arr.join("&");
    }
  }
};

/** Частные модули */
// 5 -> GPIO05
function pinToChan(pin) {
  pin = Number(pin);
  return pref + (pin < 10 ? "0" : "") + pin;
}

// GPIO05 -> 5
function chanToPin(chan) {
  return Number(chan.substr(4));
}

// Выбрать список каналов
function buildIoSet(chans) {
  let ioSet = {};
  chans.forEach(item => {
    if (item.chan && item.desc) {
      if (!ioSet[item.chan]) {
        ioSet[item.chan] = item.desc;
      } else {
        if (ioSet[item.chan] != item.desc)
          throw { message: "Different types for " + item.chan };
      }
    }
  });
  return ioSet;
}

// Выбрать список устройств для потенциальных актуаторов
function buildDnSet(links) {
  let dnSet = {};
  links.forEach(item => {
    if (item.chan && item.desc == "OUT" && item.dn) {
      if (!dnSet[item.chan]) {
        dnSet[item.chan] = item.dn;
      } else {
        if (dnSet[item.chan] != item.dn)
          throw { message: "Different devices for " + item.chan };
      }
    }
  });
  return dnSet;
}
