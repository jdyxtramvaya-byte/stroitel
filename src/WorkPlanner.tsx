import {MATERIAL_CATALOG,getMaterialSpec} from './materialCatalog'
import {useMemo,useState} from 'react'
import {Check,Trash2,Wrench,Package,Plus} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Work={id:string,name:string,roomIds:string[],thickness:number,coats:number,reserve:number,done:boolean,laborPrice?:number,productId?:string,product?:Product,quantity?:number,unit?:string}
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
 if(work.name==='Монтаж металлочерепицы')return [{name:'Металлочерепица',unit:'м²',qty:floor*1.1*reserve},{name:'Саморез кровельный',unit:'шт.',qty:floor*8*reserve}]
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
 const needsThickness=['Стяжка пола','Штукатурка стен','Шпаклёвка стен','Кладка газоблока','Кладка пеноблока','Кладка кирпича','Кладка камня','Утепление фасада','Теплоизоляция стен','Утепление кровли','Устройство ленточного фундамента','Устройство плитного фундамента'].includes(name)
 const needsCoats=/покраск|грунтовк|оклейк/.test(name.toLowerCase())
 const needsReserve=!['count','length'].includes(fieldMode)

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
  const work={id:crypto.randomUUID(),name:name.trim(),roomIds,thickness:+thickness||10,coats:+coats||1,reserve:+reserve||0,done:false,laborPrice:+laborPrice||0,productId:selected?.id,product:selected,quantity:quantity?+quantity:undefined,unit:unit||undefined}
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
    {fieldMode==='area'&&<label>{selectedPreset?.kind==='roof'?'Площадь кровли, м²':'Площадь работ, м²'}<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 186"/></label>}
    {fieldMode==='length'&&<label>Длина, м<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 35"/></label>}
    {fieldMode==='count'&&<label>Количество, шт.<input inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 8"/></label>}
    {fieldMode==='volume'&&<label>Объём, м³<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Например, 12.5"/></label>}
    {fieldMode==='generic'&&<><label>Количество<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Введите объём"/></label><label>Ед. изм.<select value={unit} onChange={e=>setUnit(e.target.value)}><option>м²</option><option>м.п.</option><option>м³</option><option>шт.</option><option>компл.</option></select></label></>}
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
