export type MaterialSpec={name:string;unit:string;packageSize:number;packageUnit:string;waste:number;price:number;priceIsEstimate:true}

export const MATERIAL_CATALOG:MaterialSpec[]=[
{name:'Сухая смесь для стяжки',unit:'кг',packageSize:25,packageUnit:'мешок',waste:5,price:18,priceIsEstimate:true},
{name:'Штукатурная смесь',unit:'кг',packageSize:30,packageUnit:'мешок',waste:5,price:17.33,priceIsEstimate:true},
{name:'Шпаклёвка',unit:'кг',packageSize:20,packageUnit:'мешок',waste:5,price:42.5,priceIsEstimate:true},
{name:'Грунтовка',unit:'л',packageSize:10,packageUnit:'канистра',waste:5,price:120,priceIsEstimate:true},
{name:'Краска',unit:'л',packageSize:10,packageUnit:'ведро',waste:5,price:240,priceIsEstimate:true},
{name:'Плитка',unit:'м²',packageSize:1.44,packageUnit:'коробка',waste:10,price:1800,priceIsEstimate:true},
{name:'Плиточный клей',unit:'кг',packageSize:25,packageUnit:'мешок',waste:5,price:28,priceIsEstimate:true}
]

export const getMaterialSpec=(name:string,unit:string)=>MATERIAL_CATALOG.find(x=>x.name===name&&x.unit===unit)
export const purchaseQty=(qty:number,spec?:MaterialSpec)=>spec&&spec.packageSize>0?{packages:Math.ceil(qty/spec.packageSize),purchaseQty:Math.ceil(qty/spec.packageSize)*spec.packageSize}:{packages:0,purchaseQty:qty}
