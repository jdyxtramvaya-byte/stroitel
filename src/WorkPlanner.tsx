import {MATERIAL_CATALOG,getMaterialSpec} from './materialCatalog'
import {useMemo,useState} from 'react'
import {Check,Trash2,Wrench,Package,Plus} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Work={id:string,name:string,roomIds:string[],thickness:number,coats:number,reserve:number,done:boolean,laborPrice?:number,productId?:string,product?:Product,quantity?:number,unit?:string,roofType?:'gable'|'hip'|'shed',roofSlope?:number,roofRidge?:number,roofValley?:number,roofEave?:number,roofGable?:number,roofAbutment?:number,roofWindows?:number,roofPenetrations?:number,rafterLength?:number,rafterSpacing?:number,rafterCount?:number,timberSection?:string}
type Product={id:string,name:string,brand:string,unit:string,packSize:number,packUnit:string,consumption:number,consumptionUnit:string}
type Material={id:string,name:string,unit:string,qty:number,price:number,bought:boolean,packageSize?:number,packageUnit?:string,packages?:number}
type Project={rooms:Room[],materials:Material[],works?:Work[]}

const products:Record<string,Product[]>= {
 'Стяжка пола':[{id:'screed-standard',name:'Сухая смесь для стяжки',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:20,consumptionUnit:'кг/м²/см'}],
 'Штукатурка стен':[{id:'knauf-mp75',name:'MP 75',brand:'Knauf',unit:'кг',packSize:30,packUnit:'мешок',consumption:0.9,consumptionUnit:'кг/м²/мм'},{id:'volma-sloy',name:'Слой',brand:'ВОЛМА',unit:'кг',packSize:30,packUnit:'мешок',consumption:0.9,consumptionUnit:'кг/м²/мм'}],
 'Шпаклёвка стен':[{id:'putty-standard',name:'Шпаклёвка',brand:'Стандарт',unit:'кг',packSize:20,packUnit:'мешок',consumption:1,consumptionUnit:'кг/м²/мм'}],
 'Покраска стен':[{id:'paint-standard',name:'Интерьерная краска',brand:'Стандарт',unit:'л',packSize:10,packUnit:'ведро',consumption:0.18,consumptionUnit:'л/м²/слой'}],
 'Укладка плитки':[{id:'tile-standard',name:'Плитка',brand:'Стандарт',unit:'м²',packSize:1.44,packUnit:'коробка',consumption:1,consumptionUnit:'м²/м²'},{id:'tile-glue-standard',name:'Плиточный клей',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:3.5,consumptionUnit:'кг/м²'}],
 'Кладка газоблока':[{id:'block',name:'Газоблок',brand:'Стандарт',unit:'м²',packSize:1,packUnit:'шт.',consumption:1,consumptionUnit:'м²/м²'},{id:'block-glue',name:'Клей для газоблока',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:20,consumptionUnit:'кг/м³'}],
 'Кладка кирпича':[{id:'brick',name:'Кирпич',brand:'Стандарт',unit:'шт.',packSize:1,packUnit:'шт.',consumption:51,consumptionUnit:'шт./м²'},{id:'mortar',name:'Кладочный раствор',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:35,consumptionUnit:'кг/м²'}],
 'Кладка камня':[{id:'stone',name:'Камень',brand:'Стандарт',unit:'м²',packSize:1,packUnit:'м²',consumption:1,consumptionUnit:'м²/м²'},{id:'stone-mortar',name:'Раствор для кладки',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:35,consumptionUnit:'кг/м²'}],
 'Монтаж гипсокартона':[{id:'gkl',name:'Гипсокартон',brand:'Стандарт',unit:'м²',packSize:3,packUnit:'лист',consumption:1.1,consumptionUnit:'м²/м²'}],
 'Прокладка кабеля':[{id:'cable',name:'Кабель',brand:'Стандарт',unit:'м',packSize:100,packUnit:'бухта',consumption:1.1,consumptionUnit:'м/м'}],
 'Установка розеток':[{id:'socket',name:'Розетка',brand:'Стандарт',unit:'шт.',packSize:1,packUnit:'шт.',consumption:1,consumptionUnit:'шт./шт.'}],
 'Разводка водоснабжения':[{id:'pipe',name:'Труба водоснабжения',brand:'Стандарт',unit:'м',packSize:10,packUnit:'бухта',consumption:1,consumptionUnit:'м/м'}],
 'Монтаж канализации':[{id:'sewer-pipe',name:'Канализационная труба',brand:'Стандарт',unit:'м',packSize:1,packUnit:'шт.',consumption:1,consumptionUnit:'м/м'}],
 'Монтаж металлочерепицы':[{id:'metal-roof',name:'Металлочерепица',brand:'Стандарт',unit:'м²',packSize:1,packUnit:'м²',consumption:1.1,consumptionUnit:'м²/м²'},{id:'roof-screw',name:'Саморез кровельный',brand:'Стандарт',unit:'шт.',packSize:250,packUnit:'упаковка',consumption:8,consumptionUnit:'шт./м²'}]
}
const materialAliases:Record<string,string>={'MP 75':'Штукатурная смесь','Слой':'Штукатурная смесь','Интерьерная краска':'Краска'}
const getSpec=(name:string,unit:string)=>getMaterialSpec(name,unit)??getMaterialSpec(materialAliases[name]??'',unit)

const packaging:Record<string,{size:number,unit:string}>={
 'Сухая смесь для стяжки|кг':{size:25,unit:'мешок'},
 'Штукатурная смесь|кг':{size:30,unit:'мешок'},
 'Шпаклёвка|кг':{size:20,unit:'мешок'},
 'Грунтовка|л':{size:10,unit:'канистра'},
 'Краска|л':{size:10,unit:'ведро'},
 'Плитка|м²':{size:1.44,unit:'коробка'},
 'Плиточный клей|кг':{size:25,unit:'мешок'}
}

const calc=(work:Work,rooms:Room)=>{
 const selected=rooms.filter(r=>work.roomIds.includes(r.id))
 const floor=selected.reduce((s,r)=>s+r.length*r.width,0)
 const wall=selected.reduce((s,r)=>s+2*(r.length+r.width)*r.height,0)
 const reserve=1+work.reserve/100
 const roofRooms=selected.length?selected:[]
 const roofRoom=roofRooms[0]
 const roofLength=roofRoom?.length||0
 const roofWidth=roofRoom?.width||0
 const roofSlope=work.roofSlope||0
 const roofCos=roofSlope>0&&roofSlope<89?Math.cos(roofSlope*Math.PI/180):1
 const roofPlan=work.quantity&&work.quantity>0?work.quantity:(roofLength*roofWidth)
 const roofArea=work.quantity&&work.quantity>0?work.quantity/roofCos:(roofPlan/roofCos)
 const roofEave=work.roofEave||roofLength*2
 const roofGable=work.roofGable||roofWidth*2
 const roofRidge=work.roofRidge||(work.roofType==='gable'?roofLength:work.roofType==='hip'?Math.max(0,roofLength-roofWidth):0)
 const roofRafters=work.rafterCount||((roofEave>0&&(work.rafterSpacing||0)>0)?Math.ceil(roofEave/(work.rafterSpacing||1))+1:0)
 const roofRafterLength=work.rafterLength||(
   work.roofType==='shed'?roofWidth/roofCos:
   work.roofType==='hip'&&roofLength&&roofWidth?Math.sqrt((roofLength/2)**2+(roofWidth/2)**2)/roofCos:
   roofWidth>0?roofWidth/2/roofCos:0
 )
 const roofSlopeRun=roofRafterLength*roofRafters
 const roofPerimeter=roofEave+roofGable
 const roofGeometryQty=(factor:number)=>roofArea*factor*reserve
 if(work.name==='Стяжка пола')return [{name:work.product?.name||'Сухая смесь для стяжки',unit:work.product?.unit||'кг',qty:floor*(work.thickness/10)*(work.product?.consumption||20)*reserve}]
 if(work.name==='Штукатурка стен')return [{name:work.product?.name||'Штукатурная смесь',unit:work.product?.unit||'кг',qty:wall*work.thickness*(work.product?.consumption||0.9)*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.15*reserve}]
 if(work.name==='Шпаклёвка стен')return [{name:work.product?.name||'Шпаклёвка',unit:work.product?.unit||'кг',qty:wall*work.thickness*(work.product?.consumption||1)*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Покраска стен')return [{name:work.product?.name||'Краска',unit:work.product?.unit||'л',qty:wall*(work.product?.consumption||0.18)*work.coats*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Укладка плитки')return [{name:'Плитка',unit:'м²',qty:wall*reserve},{name:'Плиточный клей',unit:'кг',qty:wall*3.5*reserve}]
 if(work.name==='Кладка газоблока')return [{name:'Газоблок',unit:'м²',qty:wall*reserve},{name:'Клей для газоблока',unit:'кг',qty:wall*0.2*reserve}]
 if(work.name==='Кладка кирпича')return [{name:'Кирпич',unit:'шт.',qty:wall*51*reserve},{name:'Кладочный раствор',unit:'кг',qty:wall*35*reserve}]
 if(work.name==='Кладка камня')return [{name:'Камень',unit:'м²',qty:wall*reserve},{name:'Раствор для кладки',unit:'кг',qty:wall*35*reserve}]
 if(work.name==='Монтаж гипсокартона')return [{name:'Гипсокартон',unit:'м²',qty:wall*1.1*reserve}]
 if(work.name==='Прокладка кабеля')return [{name:'Кабель',unit:'м',qty:floor*1.1*reserve}]
 if(work.name==='Установка розеток')return [{name:'Розетка',unit:'шт.',qty:floor*0.1*reserve}]
 if(work.name==='Разводка водоснабжения')return [{name:'Труба водоснабжения',unit:'м',qty:floor*0.5*reserve}]
 if(work.name==='Монтаж канализации')return [{name:'Канализационная труба',unit:'м',qty:floor*0.2*reserve}]
 if(work.name==='Монтаж металлочерепицы')return [{name:'Металлочерепица',unit:'м²',qty:(work.quantity||floor)*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:(work.quantity||floor)*8*reserve},{name:'Планка кровельная',unit:'м',qty:((work.roofRidge||0)+(work.roofEave||0)+(work.roofGable||0)+(work.roofAbutment||0))*1.05*reserve}]
 if(/стропил/.test(work.name.toLowerCase()))return [{name:'Доска строительная',unit:'м',qty:roofSlopeRun*reserve},{name:'Крепёж строительный',unit:'кг',qty:roofRafters*0.18*reserve},{name:'Деревозащитная пропитка',unit:'л',qty:roofSlopeRun*0.08*reserve}]
 if(/контробреш[её]тк/.test(work.name.toLowerCase()))return [{name:'Брусок контробрешётки',unit:'м',qty:roofSlopeRun*reserve}]
 if(/утеплен.*кров/.test(work.name.toLowerCase()))return [{name:'Утеплитель для кровли',unit:'м²',qty:roofGeometryQty(1.08)}]
 if(/гидроизоляц|пароизоляц|мембран/.test(work.name.toLowerCase()))return [{name:'Кровельная мембрана',unit:'м²',qty:roofGeometryQty(1.1)},{name:'Лента для проклейки',unit:'м',qty:roofPerimeter*0.35*reserve}]
 if(/водосточ/.test(work.name.toLowerCase()))return [{name:'Водосточная система',unit:'м',qty:roofEave*1.05*reserve},{name:'Крепёж водосточный',unit:'шт.',qty:roofEave*2*reserve}]
 if(/снегозадерж/.test(work.name.toLowerCase()))return [{name:'Снегозадержатель',unit:'м',qty:roofEave*1.05*reserve},{name:'Крепёж снегозадержателя',unit:'шт.',qty:roofEave*2*reserve}]
 if(/аэратор/.test(work.name.toLowerCase()))return [{name:'Кровельный аэратор',unit:'шт.',qty:(work.roofPenetrations||work.quantity||1)*reserve}]
 if(/стойк.*подкос/.test(work.name.toLowerCase())){const count=Math.max(1,work.rafterCount||Math.ceil((roofLength||roofWidth)/2));return [{name:'Брус для стоек и подкосов',unit:'м',qty:count*2.5*reserve},{name:'Крепёж строительный',unit:'кг',qty:count*0.25*reserve}]}
 if(/мауэрлат/.test(work.name.toLowerCase()))return [{name:'Брус',unit:'м',qty:roofPerimeter*1.05*reserve},{name:'Анкер',unit:'шт.',qty:Math.max(1,Math.ceil(roofPerimeter/1.5))}]
 if(/коньков.*балк/.test(work.name.toLowerCase()))return [{name:'Брус',unit:'м',qty:roofRidge*1.05*reserve},{name:'Крепёж строительный',unit:'кг',qty:roofRidge*0.12*reserve}]
 if(/обреш[её]тк/.test(work.name.toLowerCase())){const rows=roofSlope>0?Math.max(1,Math.ceil(roofRafterLength/0.35)):0;return [{name:'Доска строительная',unit:'м',qty:roofRafters*rows*roofRafterLength*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:roofRafters*rows*4*reserve}]}
 if(/ендов|примык|карнизн.*план|торцев.*план|кон[ьй]к.*кров|свес/.test(work.name.toLowerCase())){const base=work.roofRidge||work.roofValley||work.roofEave||work.roofGable||work.roofAbutment||roofPerimeter;return [{name:'Планка кровельная',unit:'м',qty:base*1.05*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:base*4*reserve}]}
 const q=work.quantity&&work.quantity>0?work.quantity:(/кров|стропил|обреш|утеплен.*кров|мембран/.test(work.name.toLowerCase())?floor:(/покраск|шпакл|штукатур|облицовк|фасад|гипсокартон|кладк/.test(work.name.toLowerCase())?wall:floor))
 const n=work.name.toLowerCase()
 if(/разработк.*грунт|котлован|транше/.test(n))return [{name:'Грунт обратной засыпки',unit:'м³',qty:q*reserve}]
 if(/песчан.*подуш/.test(n))return [{name:'Песок',unit:'т',qty:q*1.6*reserve}]
 if(/щеб[её]ноч.*подготов/.test(n))return [{name:'Щебень',unit:'т',qty:q*1.7*reserve}]
 if(/геотекстил/.test(n))return [{name:'Геотекстиль',unit:'м²',qty:q*reserve}]
 if(/фундамент|заливк.*бетон|бетонн.*площад|отмостк|монолит/.test(n))return [{name:'Бетон',unit:'м³',qty:q*reserve},{name:'Арматура',unit:'кг',qty:q*80*reserve},{name:'Вязальная проволока',unit:'кг',qty:q*1.2*reserve}]
 if(/опалубк/.test(n))return [{name:'Опалубочная доска',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж строительный',unit:'кг',qty:q*0.4*reserve}]
 if(/арматур|вязк.*арматур/.test(n))return [{name:'Арматура',unit:'кг',qty:q*80*reserve},{name:'Вязальная проволока',unit:'кг',qty:q*1.2*reserve}]
 if(/газоблок/.test(n))return [{name:'Газоблок',unit:'м³',qty:q*(work.thickness/1000||0.2)*reserve},{name:'Клей для газоблока',unit:'кг',qty:q*5*reserve}]
 if(/пеноблок/.test(n))return [{name:'Пеноблок',unit:'м³',qty:q*(work.thickness/1000||0.2)*reserve},{name:'Кладочный раствор',unit:'кг',qty:q*5*reserve}]
 if(/кирпич/.test(n))return [{name:'Кирпич',unit:'шт.',qty:q*51*reserve},{name:'Кладочный раствор',unit:'кг',qty:q*35*reserve}]
 if(/камн/.test(n))return [{name:'Камень',unit:'м²',qty:q*reserve},{name:'Кладочный раствор',unit:'кг',qty:q*35*reserve}]
 if(/металлическ.*каркас|металлическ.*балк|металлическ.*лестниц|сварк.*металл/.test(n))return [{name:'Профильная труба',unit:'м',qty:q*4*reserve},{name:'Электроды',unit:'кг',qty:q*0.15*reserve},{name:'Отрезной диск',unit:'шт.',qty:Math.max(1,q*0.05)}]
 if(/деревянн.*каркас|стропил|мауэрлат|коньков.*балк|стойк.*подкос|обреш[её]тк|балочн.*систем/.test(n))return [{name:'Доска строительная',unit:'м³',qty:q*0.06*reserve},{name:'Брус',unit:'м³',qty:q*0.03*reserve},{name:'Крепёж строительный',unit:'кг',qty:q*0.15*reserve},{name:'Деревозащитная пропитка',unit:'л',qty:q*0.15*reserve}]
 if(/osb|сплошн.*основан/.test(n))return [{name:'OSB-3',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*15*reserve}]
 if(/подкладочн.*ковер/.test(n))return [{name:'Подкладочный ковёр',unit:'м²',qty:q*1.1*reserve}]
 if(/металлочерепиц/.test(n))return [{name:'Металлочерепица',unit:'м²',qty:roofGeometryQty(1.1)},{name:'Крепёж кровельный',unit:'шт.',qty:roofArea*8*reserve}]
 if(/фальцев/.test(n))return [{name:'Фальцевая кровля',unit:'м²',qty:roofGeometryQty(1.1)},{name:'Кляммер',unit:'шт.',qty:roofArea*4*reserve}]
 if(/осб|сплошн.*основан/.test(n))return [{name:'OSB-3',unit:'м²',qty:roofGeometryQty(1.1)},{name:'Крепёж кровельный',unit:'шт.',qty:roofArea*15*reserve}]
 if(/гибк.*черепиц/.test(n))return [{name:'Гибкая черепица',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*8*reserve}]
 if(/композитн.*черепиц/.test(n))return [{name:'Композитная черепица',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*8*reserve}]
 if(/керамическ.*черепиц/.test(n))return [{name:'Керамическая черепица',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*5*reserve}]
 if(/цементно-песчан.*черепиц/.test(n))return [{name:'Цементно-песчаная черепица',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*5*reserve}]
 if(/ондулин/.test(n))return [{name:'Ондулин',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*20*reserve}]
 if(/шифер/.test(n))return [{name:'Шифер',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*5*reserve}]
 if(/профнастил/.test(n))return [{name:'Профнастил',unit:'м²',qty:q*1.1*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*8*reserve}]
 if(/мембран.*кров|кровельн.*гидроизоляц/.test(n))return [{name:'Кровельная мембрана',unit:'м²',qty:q*1.1*reserve}]
 if(/рулонн.*кров/.test(n))return [{name:'Рулонная кровля',unit:'м²',qty:q*1.1*reserve}]
 if(/пароизоляц/.test(n))return [{name:'Пароизоляционная плёнка',unit:'м²',qty:q*1.1*reserve}]
 if(/теплоизоляц.*кров|утеплен.*кров/.test(n))return [{name:'Утеплитель минеральный',unit:'м²',qty:q*1.05*reserve},{name:'Пароизоляционная плёнка',unit:'м²',qty:q*1.1*reserve}]
 if(/кон[ьй]к.*кров|ендов|карнизн.*план|торцев.*план|планк.*примык|свес/.test(n))return [{name:'Планка кровельная',unit:'м',qty:q*1.05*reserve},{name:'Крепёж кровельный',unit:'шт.',qty:q*4*reserve}]
 if(/утеплен.*фасад|теплоизоляц.*стен/.test(n))return [{name:'Фасадный утеплитель',unit:'м²',qty:q*1.05*reserve},{name:'Фасадный клей',unit:'кг',qty:q*5*reserve},{name:'Дюбель фасадный',unit:'шт.',qty:q*6*reserve},{name:'Фасадная сетка',unit:'м²',qty:q*1.1*reserve}]
 if(/мокр.*фасад|штукатурн.*фасад/.test(n))return [{name:'Фасадная штукатурка',unit:'кг',qty:q*2.5*reserve},{name:'Фасадная грунтовка',unit:'л',qty:q*0.15*reserve}]
 if(/сайдинг/.test(n))return [{name:'Сайдинг',unit:'м²',qty:q*1.1*reserve},{name:'Металлический профиль',unit:'м',qty:q*2*reserve},{name:'Крепёж строительный',unit:'кг',qty:q*0.08*reserve}]
 if(/перегородк.*гкл|гипсокартон/.test(n))return [{name:'Гипсокартон',unit:'м²',qty:q*1.1*reserve},{name:'Профиль ГКЛ',unit:'м',qty:q*2.2*reserve},{name:'Саморез по ГКЛ',unit:'шт.',qty:q*15*reserve},{name:'Армирующая лента',unit:'м',qty:q*0.5*reserve}]
 if(/обоя/.test(n))return [{name:'Обои',unit:'м²',qty:q*1.1*reserve},{name:'Клей для обоев',unit:'кг',qty:q*0.08*reserve}]
 if(/ламинат/.test(n))return [{name:'Ламинат',unit:'м²',qty:q*1.1*reserve},{name:'Подложка под ламинат',unit:'м²',qty:q*1.05*reserve}]
 if(/линолеум/.test(n))return [{name:'Линолеум',unit:'м²',qty:q*1.1*reserve}]
 if(/кварцвинил/.test(n))return [{name:'Кварцвинил',unit:'м²',qty:q*1.1*reserve}]
 if(/паркет/.test(n))return [{name:'Паркет',unit:'м²',qty:q*1.1*reserve}]
 if(/плинтус/.test(n))return [{name:'Плинтус',unit:'м',qty:q*1.05*reserve}]
 if(/наливн.*пол/.test(n))return [{name:'Наливной пол',unit:'кг',qty:q*1.8*reserve}]
 if(/кабел|слаботоч/.test(n))return [{name:'Кабель силовой',unit:'м',qty:q*1.1*reserve},{name:'Гофра',unit:'м',qty:q*1.05*reserve}]
 if(/подрозет/.test(n))return [{name:'Подрозетник',unit:'шт.',qty:q*reserve}]
 if(/розет/.test(n))return [{name:'Розетка',unit:'шт.',qty:q*reserve}]
 if(/выключател/.test(n))return [{name:'Выключатель',unit:'шт.',qty:q*reserve}]
 if(/светильник/.test(n))return [{name:'Светильник',unit:'шт.',qty:q*reserve}]
 if(/электрощит/.test(n))return [{name:'Электрощит',unit:'шт.',qty:q}]
 if(/автомат/.test(n))return [{name:'Автомат защиты',unit:'шт.',qty:q}]
 if(/узо|дифавтомат/.test(n))return [{name:'УЗО/дифавтомат',unit:'шт.',qty:q}]
 if(/заземлен/.test(n))return [{name:'Комплект заземления',unit:'компл.',qty:q}]
 if(/водоснабж/.test(n))return [{name:'Труба водоснабжения',unit:'м',qty:q*1.1*reserve},{name:'Фитинги водоснабжения',unit:'шт.',qty:q*0.25*reserve}]
 if(/канализац/.test(n))return [{name:'Канализационная труба',unit:'м',qty:q*1.1*reserve}]
 if(/коллектор/.test(n))return [{name:'Коллектор',unit:'шт.',qty:q}]
 if(/радиатор/.test(n))return [{name:'Радиатор',unit:'шт.',qty:q}]
 if(/т[её]пл.*пол/.test(n))return [{name:'Труба тёплого пола',unit:'м',qty:q*5*reserve}]
 if(/вентиляц/.test(n))return [{name:'Воздуховод',unit:'м',qty:q*1.1*reserve},{name:'Фасонные элементы вентиляции',unit:'шт.',qty:Math.max(1,q*0.1)}]
 if(/дренаж/.test(n))return [{name:'Дренажная труба',unit:'м',qty:q*1.1*reserve},{name:'Геотекстиль',unit:'м²',qty:q*1.5*reserve},{name:'Щебень',unit:'т',qty:q*0.2*reserve}]
 if(/наружн.*канализац/.test(n))return [{name:'Труба наружной канализации',unit:'м',qty:q*1.1*reserve},{name:'Песок',unit:'т',qty:q*0.15*reserve}]
 if(/септик/.test(n))return [{name:'Септик',unit:'шт.',qty:q}]
 if(/окн/.test(n))return [{name:'Оконный блок',unit:'шт.',qty:q},{name:'Монтажная пена',unit:'шт.',qty:q*2}]
 if(/двер/.test(n))return [{name:'Дверной блок',unit:'шт.',qty:q},{name:'Монтажная пена',unit:'шт.',qty:q*2}]
 if(/подокон/.test(n))return [{name:'Подоконник',unit:'м',qty:q*1.05*reserve}]
 if(/демонтаж/.test(n))return [{name:'Мешок строительный',unit:'шт.',qty:q*2*reserve},{name:'Расходники для демонтажа',unit:'компл.',qty:1}]
 if(/тротуарн.*плит|дорожк/.test(n))return [{name:'Тротуарная плитка',unit:'м²',qty:q*1.1*reserve},{name:'Песок',unit:'т',qty:q*0.08*reserve},{name:'Щебень',unit:'т',qty:q*0.12*reserve}]
 if(/забор/.test(n))return [{name:'Профильная труба',unit:'м',qty:q*2*reserve},{name:'Крепёж строительный',unit:'кг',qty:q*0.1*reserve}]
 if(/ворот/.test(n))return [{name:'Профильная труба',unit:'м',qty:q*6*reserve},{name:'Крепёж строительный',unit:'кг',qty:q*0.3*reserve}]
 return [{name:'Крепёж строительный',unit:'кг',qty:Math.max(1,q*0.05)}]
 return []
}

const pack=(name:string,unit:string,qty:number)=>{
 const spec=getSpec(name,unit)
 const p=packaging[name+'|'+unit]??(spec?{size:spec.packageSize,unit:spec.packageUnit}:undefined)
 if(!p)return {packages:0,purchaseQty:qty,packageSize:undefined,packageUnit:undefined}
 const packages=Math.ceil(qty/p.size)
 return {packages,purchaseQty:packages*p.size,packageSize:p.size,packageUnit:p.unit}
}


const presets=[
 {name:'Расчистка участка',category:'Подготовка',kind:'generic'},
 {name:'Разметка здания',category:'Подготовка',kind:'generic'},
 {name:'Подготовка основания',category:'Подготовка',kind:'generic'},
 {name:'Устройство временных ограждений',category:'Подготовка',kind:'generic'},
 {name:'Разработка грунта вручную',category:'Земляные работы',kind:'generic'},
 {name:'Разработка грунта экскаватором',category:'Земляные работы',kind:'generic'},
 {name:'Рытьё котлована',category:'Земляные работы',kind:'generic'},
 {name:'Разработка траншеи',category:'Земляные работы',kind:'generic'},
 {name:'Обратная засыпка',category:'Земляные работы',kind:'generic'},
 {name:'Планировка грунта',category:'Земляные работы',kind:'generic'},
 {name:'Устройство песчаной подушки',category:'Земляные работы',kind:'generic'},
 {name:'Устройство щебёночной подготовки',category:'Земляные работы',kind:'generic'},
 {name:'Бурение отверстий',category:'Земляные работы',kind:'generic'},
 {name:'Устройство свай',category:'Фундаменты',kind:'generic'},
 {name:'Забивка свай',category:'Фундаменты',kind:'generic'},
 {name:'Устройство ленточного фундамента',category:'Фундаменты',kind:'generic'},
 {name:'Устройство плитного фундамента',category:'Фундаменты',kind:'floor'},
 {name:'Устройство столбчатого фундамента',category:'Фундаменты',kind:'generic'},
 {name:'Гидроизоляция фундамента',category:'Фундаменты',kind:'generic'},
 {name:'Утепление фундамента',category:'Фундаменты',kind:'generic'},
 {name:'Армирование фундамента',category:'Бетон и железобетон',kind:'generic'},
 {name:'Устройство опалубки',category:'Бетон и железобетон',kind:'generic'},
 {name:'Вязка арматуры',category:'Бетон и железобетон',kind:'generic'},
 {name:'Заливка бетона',category:'Бетон и железобетон',kind:'generic'},
 {name:'Устройство бетонной площадки',category:'Бетон и железобетон',kind:'generic'},
 {name:'Устройство бетонной отмостки',category:'Бетон и железобетон',kind:'generic'},
 {name:'Монолитные стены',category:'Бетон и железобетон',kind:'wall'},
 {name:'Монолитное перекрытие',category:'Бетон и железобетон',kind:'floor'},
 {name:'Монолитная лестница',category:'Бетон и железобетон',kind:'generic'},
 {name:'Монтаж сборных плит',category:'Бетон и железобетон',kind:'generic'},
 {name:'Кладка газоблока',category:'Каменные работы',kind:'generic'},
 {name:'Кладка пеноблока',category:'Каменные работы',kind:'generic'},
 {name:'Кладка кирпича',category:'Каменные работы',kind:'generic'},
 {name:'Кладка камня',category:'Каменные работы',kind:'generic'},
 {name:'Кладка перегородок',category:'Каменные работы',kind:'generic'},
 {name:'Монтаж перемычек',category:'Каменные работы',kind:'generic'},
 {name:'Расшивка швов кладки',category:'Каменные работы',kind:'generic'},
 {name:'Монтаж металлического каркаса',category:'Металлоконструкции',kind:'generic'},
 {name:'Сварка металлоконструкций',category:'Металлоконструкции',kind:'generic'},
 {name:'Монтаж металлических балок',category:'Металлоконструкции',kind:'generic'},
 {name:'Монтаж металлической лестницы',category:'Металлоконструкции',kind:'generic'},
 {name:'Монтаж ограждений',category:'Металлоконструкции',kind:'generic'},
 {name:'Монтаж деревянного каркаса',category:'Деревянные работы',kind:'generic'},
 {name:'Монтаж стропильной системы',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж наслонных стропил',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж висячих стропил',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж балочной системы',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж мауэрлата',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж коньковой балки',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж стоек и подкосов',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж обрешётки',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж контробрешётки',category:'Деревянные работы',kind:'roof'},
 {name:'Монтаж деревянных перегородок',category:'Деревянные работы',kind:'generic'},
 {name:'Монтаж террасы',category:'Деревянные работы',kind:'generic'},
 {name:'Монтаж настила из доски',category:'Деревянные работы',kind:'generic'},
 {name:'Монтаж сплошного основания кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж OSB основания',category:'Кровля',kind:'roof'},
 {name:'Монтаж подкладочного ковра',category:'Кровля',kind:'roof'},
 {name:'Монтаж металлочерепицы',category:'Кровля',kind:'roof'},
 {name:'Монтаж профнастила',category:'Кровля',kind:'roof'},
 {name:'Монтаж мягкой кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж гибкой черепицы',category:'Кровля',kind:'roof'},
 {name:'Монтаж фальцевой кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж композитной черепицы',category:'Кровля',kind:'roof'},
 {name:'Монтаж керамической черепицы',category:'Кровля',kind:'roof'},
 {name:'Монтаж цементно-песчаной черепицы',category:'Кровля',kind:'roof'},
 {name:'Монтаж ондулина',category:'Кровля',kind:'roof'},
 {name:'Монтаж шифера',category:'Кровля',kind:'roof'},
 {name:'Монтаж мембранной кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж рулонной кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж поликарбоната на кровлю',category:'Кровля',kind:'roof'},
 {name:'Монтаж кровельной гидроизоляции',category:'Кровля',kind:'roof'},
 {name:'Монтаж кровельной пароизоляции',category:'Кровля',kind:'roof'},
 {name:'Монтаж теплоизоляции кровли',category:'Кровля',kind:'roof'},
 {name:'Устройство вентиляционного зазора',category:'Кровля',kind:'roof'},
 {name:'Устройство кровельных свесов',category:'Кровля',kind:'roof'},
 {name:'Монтаж конька кровли',category:'Кровля',kind:'roof'},
 {name:'Монтаж ендовы',category:'Кровля',kind:'roof'},
 {name:'Монтаж карнизной планки',category:'Кровля',kind:'roof'},
 {name:'Монтаж торцевой планки',category:'Кровля',kind:'roof'},
 {name:'Монтаж планки примыкания',category:'Кровля',kind:'roof'},
 {name:'Монтаж мансардных окон',category:'Кровля',kind:'generic'},
 {name:'Монтаж кровельных аэраторов',category:'Кровля',kind:'generic'},
 {name:'Монтаж водосточной системы',category:'Кровля',kind:'generic'},
 {name:'Монтаж снегозадержателей',category:'Кровля',kind:'generic'},
 {name:'Гидроизоляция',category:'Изоляция',kind:'generic'},
 {name:'Пароизоляция',category:'Изоляция',kind:'generic'},
 {name:'Теплоизоляция стен',category:'Изоляция',kind:'wall'},
 {name:'Утепление кровли',category:'Изоляция',kind:'roof'},
 {name:'Звукоизоляция стен',category:'Изоляция',kind:'wall'},
 {name:'Утепление фасада',category:'Фасад',kind:'wall'},
 {name:'Штукатурный фасад',category:'Фасад',kind:'wall'},
 {name:'Мокрый фасад',category:'Фасад',kind:'wall'},
 {name:'Облицовка фасада',category:'Фасад',kind:'wall'},
 {name:'Монтаж фасадных панелей',category:'Фасад',kind:'wall'},
 {name:'Монтаж сайдинга',category:'Фасад',kind:'generic'},
 {name:'Монтаж отливов',category:'Фасад',kind:'generic'},
 {name:'Стяжка пола',category:'Отделка',kind:'floor'},
 {name:'Штукатурка стен',category:'Отделка',kind:'wall'},
 {name:'Шпаклёвка стен',category:'Отделка',kind:'wall'},
 {name:'Покраска стен',category:'Отделка',kind:'wall'},
 {name:'Покраска потолка',category:'Отделка',kind:'generic'},
 {name:'Монтаж гипсокартона',category:'Отделка',kind:'wall'},
 {name:'Монтаж перегородок из ГКЛ',category:'Отделка',kind:'generic'},
 {name:'Монтаж подвесного потолка',category:'Отделка',kind:'generic'},
 {name:'Монтаж натяжного потолка',category:'Отделка',kind:'generic'},
 {name:'Оклейка стен обоями',category:'Отделка',kind:'wall'},
 {name:'Декоративная штукатурка',category:'Отделка',kind:'wall'},
 {name:'Укладка плитки',category:'Полы и облицовка',kind:'tile'},
 {name:'Облицовка стен плиткой',category:'Полы и облицовка',kind:'wall'},
 {name:'Укладка керамогранита',category:'Полы и облицовка',kind:'floor'},
 {name:'Укладка ламината',category:'Полы и облицовка',kind:'floor'},
 {name:'Укладка линолеума',category:'Полы и облицовка',kind:'floor'},
 {name:'Укладка кварцвинила',category:'Полы и облицовка',kind:'floor'},
 {name:'Укладка паркета',category:'Полы и облицовка',kind:'floor'},
 {name:'Монтаж плинтуса',category:'Полы и облицовка',kind:'generic'},
 {name:'Шлифовка пола',category:'Полы и облицовка',kind:'floor'},
 {name:'Наливной пол',category:'Полы и облицовка',kind:'generic'},
 {name:'Прокладка кабеля',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж кабель-канала',category:'Электромонтаж',kind:'generic'},
 {name:'Штробление стен',category:'Электромонтаж',kind:'wall'},
 {name:'Установка подрозетников',category:'Электромонтаж',kind:'generic'},
 {name:'Установка розеток',category:'Электромонтаж',kind:'generic'},
 {name:'Установка выключателей',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж светильников',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж электрощита',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж автоматов защиты',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж УЗО/дифавтоматов',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж заземления',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж слаботочных сетей',category:'Электромонтаж',kind:'generic'},
 {name:'Монтаж домофона',category:'Электромонтаж',kind:'generic'},
 {name:'Разводка водоснабжения',category:'Сантехника',kind:'generic'},
 {name:'Монтаж канализации',category:'Сантехника',kind:'generic'},
 {name:'Монтаж водомерного узла',category:'Сантехника',kind:'generic'},
 {name:'Монтаж коллектора',category:'Сантехника',kind:'generic'},
 {name:'Монтаж инсталляции',category:'Сантехника',kind:'generic'},
 {name:'Установка унитаза',category:'Сантехника',kind:'generic'},
 {name:'Установка раковины',category:'Сантехника',kind:'generic'},
 {name:'Установка ванны',category:'Сантехника',kind:'generic'},
 {name:'Установка душевой кабины',category:'Сантехника',kind:'generic'},
 {name:'Установка смесителя',category:'Сантехника',kind:'generic'},
 {name:'Монтаж отопления',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж радиаторов',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж тёплого пола',category:'Отопление и вентиляция',kind:'floor'},
 {name:'Монтаж котла',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж дымохода',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж вентиляции',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж кондиционера',category:'Отопление и вентиляция',kind:'generic'},
 {name:'Монтаж наружного водопровода',category:'Наружные сети',kind:'generic'},
 {name:'Монтаж наружной канализации',category:'Наружные сети',kind:'generic'},
 {name:'Монтаж ливневой канализации',category:'Наружные сети',kind:'generic'},
 {name:'Монтаж дренажа',category:'Наружные сети',kind:'generic'},
 {name:'Монтаж септика',category:'Наружные сети',kind:'generic'},
 {name:'Монтаж дверей',category:'Столярные',kind:'generic'},
 {name:'Монтаж окон',category:'Столярные',kind:'generic'},
 {name:'Монтаж подоконников',category:'Столярные',kind:'generic'},
 {name:'Монтаж деревянных панелей',category:'Столярные',kind:'generic'},
 {name:'Демонтаж стен',category:'Демонтаж',kind:'wall'},
 {name:'Демонтаж перегородок',category:'Демонтаж',kind:'generic'},
 {name:'Демонтаж пола',category:'Демонтаж',kind:'floor'},
 {name:'Демонтаж кровли',category:'Демонтаж',kind:'roof'},
 {name:'Демонтаж сантехники',category:'Демонтаж',kind:'generic'},
 {name:'Демонтаж электрики',category:'Демонтаж',kind:'generic'},
 {name:'Демонтаж дверей и окон',category:'Демонтаж',kind:'generic'},
 {name:'Устройство отмостки',category:'Благоустройство',kind:'generic'},
 {name:'Укладка тротуарной плитки',category:'Благоустройство',kind:'tile'},
 {name:'Устройство дорожек',category:'Благоустройство',kind:'generic'},
 {name:'Устройство площадки',category:'Благоустройство',kind:'generic'},
 {name:'Установка забора',category:'Благоустройство',kind:'generic'},
 {name:'Установка ворот',category:'Благоустройство',kind:'generic'},
 {name:'Устройство ливневки',category:'Благоустройство',kind:'generic'}
] as const

export default function WorkPlanner({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const works=project.works??[]
 const [name,setName]=useState('Стяжка пола')
 const [roomIds,setRoomIds]=useState<string[]>(project.rooms[0]?[project.rooms[0].id]:[])
 const [thickness,setThickness]=useState('50')
 const [coats,setCoats]=useState('2')
 const [reserve,setReserve]=useState('10')
 const [laborPrice,setLaborPrice]=useState('0')
 const [quantity,setQuantity]=useState('')
 const [unit,setUnit]=useState('м²')
 const [productId,setProductId]=useState('')
 const [roofType,setRoofType]=useState<'gable'|'hip'|'shed'>('gable')
 const [roofSlope,setRoofSlope]=useState('30')
 const [roofRidge,setRoofRidge]=useState('')
 const [roofValley,setRoofValley]=useState('')
 const [roofEave,setRoofEave]=useState('')
 const [roofGable,setRoofGable]=useState('')
 const [roofAbutment,setRoofAbutment]=useState('')
 const [roofWindows,setRoofWindows]=useState('0')
 const [roofPenetrations,setRoofPenetrations]=useState('0')
 const [rafterLength,setRafterLength]=useState('')
 const [rafterSpacing,setRafterSpacing]=useState('0.6')
 const [rafterCount,setRafterCount]=useState('')
 const [timberSection,setTimberSection]=useState('50×200')
 const productOptions=products[name]??[]
 const product=productOptions.find(x=>x.id===productId)??productOptions[0]
 const selectedPreset=presets.find(p=>p.name===name)
 const fieldMode=useMemo(()=>{
  const n=name.toLowerCase()
  if(selectedPreset?.kind==='roof')return 'area'
  if(selectedPreset?.kind==='wall')return 'wall'
  if(selectedPreset?.kind==='floor'||selectedPreset?.kind==='tile')return 'area'
  if(/покраск|оклейк|шпакл|штукатур|облицовк.*стен|фасад|гипсокартон|перегород|кладк/.test(n))return 'wall'
  if(/плитк|керамогранит|ламинат|линолеум|кварцвинил|паркет|пола|стяжк|площадк|отмостк|дорожк/.test(n))return 'area'
  if(/кабел|труб|водопровод|канализац|дренаж|ливнев|забор|огражден|водосточ|слаботоч/.test(n))return 'length'
  if(/розет|выключател|светильник|двер|окн|подокон|радиатор|смесител|унитаз|ванн|кот[её]л|кондиционер|домофон|свай|ворот|септик|коллектор|инсталляц/.test(n))return 'count'
  if(/бетон|фундамент|котлован|транше|грунт|засыпк|опалуб|арматур|монолит|сборн.*плит/.test(n))return 'volume'
  return 'generic'
 },[name,selectedPreset?.kind])
 const n=name.toLowerCase()
 const needsThickness=['Стяжка пола','Штукатурка стен','Шпаклёвка стен','Кладка газоблока','Кладка пеноблока','Кладка кирпича','Кладка камня','Утепление фасада','Теплоизоляция стен','Утепление кровли','Устройство ленточного фундамента','Устройство плитного фундамента'].includes(name)
 const needsCoats=/покраск|грунтовк|оклейк/.test(n)
 const isRoof=selectedPreset?.kind==='roof'
 const roofFields=useMemo(()=>{
  if(!isRoof)return [] as string[]
  if(/наслонн.*стропил|висяч.*стропил|стропильн.*систем/.test(n))return ['area','slope','rafterLength','rafterSpacing','rafterCount','timberSection','reserve']
  if(/балочн.*систем/.test(n))return ['area','timberSection','reserve']
  if(/мауэрлат/.test(n))return ['area','eave','timberSection','reserve']
  if(/коньков.*балк/.test(n))return ['area','ridge','timberSection','reserve']
  if(/стойк.*подкос/.test(n))return ['area','rafterCount','timberSection','reserve']
  if(/обреш[её]тк|контробреш[её]тк/.test(n))return ['area','slope','reserve']
  if(/сплошн.*основан|osb/.test(n))return ['area','reserve']
  if(/подкладочн.*ковер/.test(n))return ['area','reserve']
  if(/ендов/.test(n))return ['valley','reserve']
  if(/свес/.test(n))return ['eave','reserve']
  if(/карнизн.*план/.test(n))return ['eave','reserve']
  if(/торцев.*план/.test(n))return ['gable','reserve']
  if(/планк.*примык/.test(n))return ['abutment','reserve']
  if(/мансардн.*окн/.test(n))return ['windows','reserve']
  if(/аэратор/.test(n))return ['count','reserve']
  if(/водосточ/.test(n))return ['eave','reserve']
  if(/снегозадерж/.test(n))return ['eave','reserve']
  if(/гидроизоляц|пароизоляц|мембран/.test(n))return ['area','penetrations','reserve']
  if(/теплоизоляц/.test(n))return ['area','thickness','reserve']
  if(/поликарбонат|черепиц|металлочерепиц|профнастил|фальцев|ондулин|шифер|мягк.*кров/.test(n))return ['area','slope','ridge','valley','eave','gable','abutment','penetrations','reserve']
  return ['area','reserve']
 },[isRoof,n])
 const roofGeometry=useMemo(()=>{
  if(!isRoof)return {planArea:0,roofArea:0,rafterCount:0,rafterLength:0}
  const selected=project.rooms.filter(r=>roomIds.includes(r.id))
  const planArea=quantity&&+quantity>0?+quantity:selected.reduce((s,r)=>s+r.length*r.width,0)
  const slope=+roofSlope||0
  const roofArea=slope>0&&slope<89?planArea/Math.cos(slope*Math.PI/180):planArea
  const spacing=+rafterSpacing||0
  const eave=+roofEave||0
  const rafterCount=eave>0&&spacing>0?Math.ceil(eave/spacing)+1:0
  const room=selected[0]
  const span=room?.width||0
  const run=room?.length||0
  const halfSpan=span/2
  const cos=slope>0&&slope<89?Math.cos(slope*Math.PI/180):1
  const rafterLength=roofType==='hip'&&run>0&&span>0&&slope>0&&slope<89?Math.sqrt((run/2)**2+(span/2)**2)/cos:roofType==='shed'&&span>0&&slope>0&&slope<89?span/cos:halfSpan>0&&slope>0&&slope<89?halfSpan/cos:0
  const hipRidge=roofType==='hip'&&run>span&&slope>0?Math.max(0,run-span):0
  return {planArea,roofArea,rafterCount,rafterLength,hipRidge}
 },[isRoof,project.rooms,roomIds,quantity,roofType,roofSlope,rafterSpacing,roofEave])
 const needsReserve=isRoof||!['count','length'].includes(fieldMode)

 const totals=useMemo(()=>{
  const map=new Map<string,{unit:string,qty:number}>()
  works.forEach(w=>calc(w,project.rooms).forEach(m=>{
   const key=m.name+'|'+m.unit
   const old=map.get(key)
   map.set(key,{unit:m.unit,qty:(old?.qty??0)+m.qty})
  }))
  return [...map.entries()].map(([key,v])=>({name:key.split('|')[0],...v}))
 },[works,project.rooms])

 const materialsFor=(workList:Work[])=>{
  const map=new Map<string,{unit:string,qty:number}>()
  workList.forEach(w=>calc(w,project.rooms).forEach(m=>{
   const key=m.name+'|'+m.unit,old=map.get(key)
   map.set(key,{unit:m.unit,qty:(old?.qty??0)+m.qty})
  }))
  const calculated=[...map.entries()].map(([key,v])=>({name:key.split('|')[0],...v,...pack(key.split('|')[0],v.unit,v.qty)}))
  const next=project.materials.map(m=>{
   const found=calculated.find(x=>x.name===m.name&&x.unit===m.unit)
   if(!found)return m
   const spec=getSpec(m.name,m.unit)
   return {...m,qty:found.purchaseQty,price:m.price>0?m.price:(spec?.price??0),packageSize:found.packageSize??spec?.packageSize,packageUnit:found.packageUnit??spec?.packageUnit,packages:found.packages||(spec?Math.ceil(found.purchaseQty/spec.packageSize):m.packages)}
  })
  calculated.filter(x=>!project.materials.some(m=>m.name===x.name&&m.unit===x.unit)).forEach(x=>{
   const spec=getSpec(x.name,x.unit)
   next.push({id:crypto.randomUUID(),name:x.name,unit:x.unit,qty:x.purchaseQty,price:spec?.price??0,bought:false,packageSize:x.packageSize??spec?.packageSize,packageUnit:x.packageUnit??spec?.packageUnit,packages:x.packages||(spec?Math.ceil(x.purchaseQty/spec.packageSize):undefined)})
  })
  return next
 }
 const syncMaterials=()=>onUpdate({materials:materialsFor(works)})

 const add=()=>{
  const selected=productOptions.find(x=>x.id===productId)??productOptions[0]
  if(!name.trim()||roomIds.length===0)return
  const manualQuantity=quantity?+quantity:undefined
  const autoQuantity=isRoof&&roofGeometry.roofArea>0?roofGeometry.roofArea:undefined
  const work={id:crypto.randomUUID(),name:name.trim(),roomIds,roofType:isRoof?roofType:undefined,thickness:+thickness||10,coats:+coats||1,reserve:+reserve||0,done:false,laborPrice:+laborPrice||0,productId:selected?.id,product:selected,quantity:manualQuantity??autoQuantity,unit:unit||undefined,roofSlope:+roofSlope||undefined,roofRidge:+roofRidge||undefined,roofValley:+roofValley||undefined,roofEave:+roofEave||undefined,roofGable:+roofGable||undefined,roofAbutment:+roofAbutment||undefined,roofWindows:+roofWindows||0,roofPenetrations:+roofPenetrations||0,rafterLength:+rafterLength||roofGeometry.rafterLength||undefined,rafterSpacing:+rafterSpacing||undefined,rafterCount:+rafterCount||roofGeometry.rafterCount||undefined,timberSection:timberSection||undefined}
  const nextWorks=[...works,work]
  onUpdate({works:nextWorks,materials:materialsFor(nextWorks)})
 }

 const toggleRoom=(id:string)=>setRoomIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])

 return <section className="work-planner compact-module"><div className="module-hero"><div><span className="section-kicker">РАБОТЫ</span><h2>Работы</h2><p>{works.length} операций · расчёт материалов автоматически.</p></div><Wrench size={22}/></div>
  <div className="section-title"><div><h2>Что сделать</h2><span>Работы автоматически превращаются в расчёт материалов.</span></div><Wrench size={22}/></div>
  {project.rooms.length===0?<div className="empty compact"><b>Сначала добавь помещение</b><p>После замеров здесь можно назначать работы.</p></div>:<>
   <details className="work-add-details"><summary><Plus size={16}/> Добавить работу</summary><div className="form-card">
    <label>Категория<select value={presets.find(p=>p.name===name)?.category||''} onChange={e=>{const first=presets.find(p=>p.category===e.target.value);if(first){setName(first.name);setProductId('')}}}>{[...new Set(presets.map(p=>p.category))].map(x=><option key={x}>{x}</option>)}</select></label><label>Работа<select value={name} onChange={e=>{setName(e.target.value);setProductId('')}}>{presets.filter(p=>p.category===(presets.find(x=>x.name===name)?.category||presets[0].category)).map(p=><option key={p.name}>{p.name}</option>)}</select></label>
    {productOptions.length>0&&<><label>Конкретный материал<select value={productId||product?.id||''} onChange={e=>setProductId(e.target.value)}>{productOptions.map(p=><option key={p.id} value={p.id}>{p.brand} · {p.name} · {p.packSize} {p.unit}/{p.packUnit}</option>)}</select></label>{product&&<div className="info-box">Норма расхода: {product.consumption} {product.consumptionUnit}</div>}</>}
    <label>Помещения</label>
    <div className="room-picker">{project.rooms.map(r=><button type="button" className={roomIds.includes(r.id)?'selected':''} key={r.id} onClick={()=>toggleRoom(r.id)}><span>{roomIds.includes(r.id)&&<Check size={14}/>}</span>{r.name}</button>)}</div>
    <div className="grid3">
    {fieldMode==='area'&&!isRoof&&<label>Площадь работ, м²<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 186"/></label>}
    {fieldMode==='length'&&<label>Длина, м<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 35"/></label>}
    {fieldMode==='count'&&<label>Количество, шт.<input inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 8"/></label>}
    {fieldMode==='volume'&&<label>Объём, м³<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 12.5"/></label>}
    {fieldMode==='generic'&&<><label>Количество<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Введите объём"/></label><label>Ед. изм.<select value={unit} onChange={e=>setUnit(e.target.value)}><option>м²</option><option>м.п.</option><option>м³</option><option>шт.</option><option>компл.</option></select></label></>}
    {isRoof&&roofFields.includes('area')&&<label>Площадь кровли, м²<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 186"/></label>}
    {isRoof&&roofFields.includes('slope')&&<><label>Тип кровли<select value={roofType} onChange={e=>setRoofType(e.target.value as 'gable'|'hip'|'shed')}><option value="gable">Двускатная</option><option value="hip">Четырёхскатная (вальмовая)</option><option value="shed">Односкатная</option></select></label><label>Уклон кровли, °<input inputMode="decimal" value={roofSlope} onChange={e=>setRoofSlope(e.target.value)} placeholder="Например, 30"/></label></>}
    {isRoof&&roofFields.includes('ridge')&&<label>Длина конька, м<input inputMode="decimal" value={roofRidge} onChange={e=>setRoofRidge(e.target.value)} placeholder="Например, 12"/></label>}
    {isRoof&&roofFields.includes('valley')&&<label>Длина ендов, м<input inputMode="decimal" value={roofValley} onChange={e=>setRoofValley(e.target.value)} placeholder="Например, 8"/></label>}
    {isRoof&&roofFields.includes('eave')&&<label>Длина свесов/карниза, м<input inputMode="decimal" value={roofEave} onChange={e=>setRoofEave(e.target.value)} placeholder="Например, 24"/></label>}
    {isRoof&&roofFields.includes('gable')&&<label>Длина фронтонов, м<input inputMode="decimal" value={roofGable} onChange={e=>setRoofGable(e.target.value)} placeholder="Например, 18"/></label>}
    {isRoof&&roofFields.includes('abutment')&&<label>Длина примыканий, м<input inputMode="decimal" value={roofAbutment} onChange={e=>setRoofAbutment(e.target.value)} placeholder="Например, 6"/></label>}
    {isRoof&&roofFields.includes('windows')&&<label>Мансардных окон, шт.<input inputMode="numeric" value={roofWindows} onChange={e=>setRoofWindows(e.target.value)} placeholder="Например, 2"/></label>}
    {isRoof&&roofFields.includes('count')&&<label>Аэраторов, шт.<input inputMode="numeric" value={roofPenetrations} onChange={e=>setRoofPenetrations(e.target.value)} placeholder="Например, 4"/></label>}
    {isRoof&&roofFields.includes('penetrations')&&<label>Проходок/примыканий, шт.<input inputMode="numeric" value={roofPenetrations} onChange={e=>setRoofPenetrations(e.target.value)} placeholder="Например, 3"/></label>}
    {isRoof&&roofFields.includes('rafterLength')&&<label>Длина стропил, м<input inputMode="decimal" value={rafterLength} onChange={e=>setRafterLength(e.target.value)} placeholder="Например, 5.8"/></label>}
    {isRoof&&roofFields.includes('rafterSpacing')&&<label>Шаг стропил, м<input inputMode="decimal" value={rafterSpacing} onChange={e=>setRafterSpacing(e.target.value)} placeholder="Например, 0.6"/></label>}
    {isRoof&&roofFields.includes('rafterCount')&&<label>Количество стропил, шт.<input inputMode="numeric" value={rafterCount} onChange={e=>setRafterCount(e.target.value)} placeholder="Рассчитается по шагу"/></label>}
    {isRoof&&roofFields.includes('timberSection')&&<label>Сечение древесины, мм<input value={timberSection} onChange={e=>setTimberSection(e.target.value)} placeholder="50×200"/></label>}
    {isRoof&&roofGeometry.planArea>0&&<div className="info-box" style={{gridColumn:'1 / -1'}}><b>Расчётная геометрия:</b> плановая площадь {roofGeometry.planArea.toFixed(1)} м² · площадь скатов {roofGeometry.roofArea.toFixed(1)} м²{roofGeometry.rafterCount>0&&(' · стропил ориентировочно '+roofGeometry.rafterCount+' шт.')}{roofGeometry.rafterLength>0&&(' · длина стропилины ориентировочно '+roofGeometry.rafterLength.toFixed(2)+' м')}<br/><small>Расчёт площади учитывает уклон. Длина стропил — оценка для двускатной схемы; ручное значение имеет приоритет.</small></div>}
    {needsThickness&&<label>Толщина, мм<input inputMode="decimal" value={thickness} onChange={e=>setThickness(e.target.value)}/></label>}
    {needsCoats&&<label>Слоёв<input inputMode="numeric" value={coats} onChange={e=>setCoats(e.target.value)}/></label>}
    {needsReserve&&<label>Запас материалов, %<input inputMode="numeric" value={reserve} onChange={e=>setReserve(e.target.value)}/></label>}
   </div>
    <label>Стоимость работы, ₽<input inputMode="decimal" value={laborPrice} onChange={e=>setLaborPrice(e.target.value)} placeholder="Например, 25000"/></label>
    <label>Своя работа<input value={!presets.some(p=>p.name===name)?name:''} onChange={e=>{setName(e.target.value);setProductId('')}} placeholder="Например: монтаж перегородки"/></label><button className="primary wide" onClick={add} disabled={!roomIds.length||!name.trim()}>Добавить работу</button>
   </div></details>
   {works.length>0&&<div className="work-list">{works.map(w=><div className="work-card" key={w.id}><div><b>{w.name}</b><small>{project.rooms.filter(r=>w.roomIds.includes(r.id)).map(r=>r.name).join(', ')} · {Number(w.laborPrice||0).toLocaleString('ru-RU')} ₽</small>{calc(w,project.rooms).map(m=><span key={m.name}>{m.name}: {m.qty.toFixed(1)} {m.unit}</span>)}</div><div className="work-actions"><button className="icon-btn" onClick={()=>onUpdate({works:works.map(x=>x.id===w.id?{...x,done:!x.done}:x)})}>{w.done?<Check size={17}/>:<span>○</span>}</button><button className="icon-btn danger" onClick={()=>onUpdate({works:works.filter(x=>x.id!==w.id)})}><Trash2 size={16}/></button></div></div>)}</div>}
   <div className="section-title"><div><h2>Материалы по работам</h2><span>Количество округляется до целой упаковки.</span></div><button className="link" onClick={syncMaterials}>Добавить в материалы</button></div>
   <div className="material-list">{totals.length===0?<div className="empty compact"><b>Добавь первую работу</b></div>:totals.map(m=>{const p=pack(m.name,m.unit,m.qty);return <div className="material-row" key={m.name}><div><b>{m.name}</b><span>Нужно {m.qty.toFixed(1)} {m.unit} · купить {p.packages||'—'} {p.packageUnit||m.unit}</span></div><strong>{p.purchaseQty.toFixed(1)} {m.unit}</strong><Package size={17}/></div>})}</div>
  </>}
 </section>
}
