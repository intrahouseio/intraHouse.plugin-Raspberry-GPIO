/**
 * Функции - адаптеры для rpi
 */
module.exports = {
  // Передать в командной строке входы и выходы:  5=U,7=D 22=1,20=0
  getArgs: function(unit, houser) {
    // Получить все каналы для rpi
    let chans = houser.jdbGet({ name: 'devprops', filter: { unit: 'rpi' } });
    if (chans.length <= 0) throw { message: 'No channels for rpi!!' };
    let ioSet = buildIoSet(chans);
    let dnSet = buildDnSet(chans);

    let argsArr = [];
    let inarr = [];
    let outarr = [];
    Object.keys(ioSet).forEach(io =>{
        switch (ioSet[io]) {
          case 'IU':
            inarr.push(io + '=U');
            break;
          case 'ID':
            inarr.push(io + '=D');
            break;
          
          case 'O':
          // Здесь надо вернуть текущее значение, т к это потенциальный выход - найти устройство
            if (dnSet[io]) {
              let dobj = houser.getDevobj(dnSet[io]);
              let val = (dobj) ? dobj.dval : 0;
              outarr.push(io + '='+val); 
            }
            break;  
        }
    });

    argsArr.push(inarr.join(','));
    argsArr.push(outarr.join(','));
    return argsArr;
  },

  // Пришла строка RPI?5=1 - сформируем объект {type:data, data:[{id:xx, value:yy}]}
  readTele: function(tele, houser) {
    if (!tele || tele.length <5)  return;

    let arr = tele.substr(4).split('=');
    if (arr && arr.length == 2) {
      return {type:'data', data:[{id:arr[0], value:arr[1]}]};
    }  
  },

  // Нужно передать команду { type: 'act', data:[{id:xx, value:yy}] } в виде строки RPI?20=1&21=0
  formTele: function(mes, houser) {
    let arr=[];
    if (mes && mes.data && mes.data.length >0) {
      mes.data.forEach(item => {
        arr.push(item.chan+'='+item.value)
      });
      if (arr.length>0) return 'RPI?'+arr.join('&');
    }
  }

};


/** Частные модули */


// Выбрать список каналов
function buildIoSet(chans) {
  let ioSet = {};
  chans.forEach(item => {
    if (item.chan && item.gptype) {
      if (!ioSet[item.chan]) {
        ioSet[item.chan] = item.gptype;
      } else {
        if (ioSet[item.chan] != item.gptype)  throw { message: 'Different types for '+item.chan };
      }  
    }  
  });
  return ioSet;  
}

// Выбрать список устройств для потенциальных актуаторов
function buildDnSet(chans) {
  let dnSet = {};
  chans.forEach(item => {
    if (item.chan && (item.gptype == 'O') && (item.dn)) {
      if (!dnSet[item.chan]) {
        dnSet[item.chan] = item.dn;
      } else {
        if (dnSet[item.chan] != item.dn)  throw { message: 'Different devices for '+item.chan };
      }  
    }  
  });
  return dnSet;  
}
