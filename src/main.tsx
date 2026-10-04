import React,{Component} from 'react'
import type {ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
import './styles.css'

class ErrorBoundary extends Component<{children:ReactNode},{error:string|null}>{
  state:{error:string|null}={error:null}
  static getDerivedStateFromError(error:unknown){
    return {error:error instanceof Error?error.message:String(error)}
  }
  render(){
    if(this.state.error){
      return <div style={{padding:24,fontFamily:'system-ui',color:'#111827'}}>
        <h2>Не удалось запустить «Строитель»</h2>
        <p>Ошибка приложения: {this.state.error}</p>
        <button onClick={()=>location.reload()} style={{padding:'12px 16px',border:0,borderRadius:10,background:'#1f6feb',color:'#fff'}}>Перезапустить</button>
      </div>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>
)
