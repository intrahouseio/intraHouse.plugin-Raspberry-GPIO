/**
 * Функции - адаптеры для rpi
 */

 const util = require('util');
 
const pref = "GPIO";


module.exports = {
  // Передать в командной строке входы и выходы:  5=U,7=D 22=1,20=0
  getArgs: function(unit, houser) {
    // Получить все каналы для rpi
    let chans = houser.jdbGet({
      name: "devprops",
      filter: { unit: "raspgpio" }
    });
    if (chans.length <= 0) throw { message: "No channels for raspgpio!!" };
    let ioSet = buildIoSet(chans);
    let dnSet = buildDnSet(chans);

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
          if (dnSet[io]) {
            let dobj = houser.getDevobj(dnSet[io]);
            let val = dobj ? dobj.dval : 0;
            outarr.push(chanToPin(io) + "=" + val);
          }
          break;
      }
    });

    argsArr.push(inarr.join(","));
    argsArr.push(outarr.join(","));
	console.log('WARN: ARGS='+argsArr.join(' '));
    return argsArr;
  },

  // Пришла строка RPI?5=1 - сформируем объект {type:data, data:[{id:xx, value:yy}]}
  readTele: function(tele, houser) {
    if (!tele || tele.length < 5) return;
	console.log('WARN: readTele='+tele);
	
    let arr = tele.substr(4).split("=");
    if (arr && arr.length == 2) {
      return { type: "data", data: [{ id: pinToChan(arr[0]), value: arr[1] }] };
    }
  },

  // Нужно передать команду { type: 'act', data:[{id:xx, value:yy}] } в виде строки RPI?20=1&21=0
  formTele: function(mes, houser) {
    let arr = [];
	console.log('WARN: formTele for '+util.inspect(mes));
    if (mes && mes.data && mes.data.length > 0) {
      mes.data.forEach(item => {
		let value;
		if (item.command == 'on') value=1;
		if (item.command == 'off') value=0;
		
        arr.push(chanToPin(item.chan) + "=" + value);
      });
		console.log('WARN: formTele='+"RPI?" + arr.join("&"));
      if (arr.length > 0) return "RPI?" + arr.join("&");
    }
  },

  /*
  formMessage: function(mes, houser) {
	console.log('WARN: formMessage '+util.inspect(mes));
    return mes;
  }
  */
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
    if (item.chan && item.gptype) {
      if (!ioSet[item.chan]) {
        ioSet[item.chan] = item.gptype;
      } else {
        if (ioSet[item.chan] != item.gptype)
          throw { message: "Different types for " + item.chan };
      }
    }
  });
  return ioSet;
}

// Выбрать список устройств для потенциальных актуаторов
function buildDnSet(chans) {
  let dnSet = {};
  chans.forEach(item => {
    if (item.chan && item.gptype == "OUT" && item.dn) {
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
