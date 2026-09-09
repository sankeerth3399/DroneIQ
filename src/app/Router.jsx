import { Routes, Route } from "react-router-dom"
import MainLayout from '@/layout/mainlayout.jsx'

import Dashboard from "@/features/dashboard/pages/dashboard.jsx"
import Fly from "@/features/fly/pages/fly.jsx"
import Mession from "@/features/mession/pages/MissionPage.jsx"
import Plan from "@/features/plan/pages/Plan.jsx"
import Waypts from "@/features/waypts/pages/Waypts.jsx"
import Logs from "@/features/logs/pages/Logs.jsx"
import Landing from "@/features/landing/pages/landingPage.jsx"
import Login from "@/features/auth/pages/Login.jsx"


const Routing = () =>{
    return(
        <Routes>
            <Route path="/" element={<Landing/>}/>
            <Route path="/landing" element={<Landing/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route element={<MainLayout/>}>
                <Route path="/dashboard" element={<Dashboard/>}/>
                <Route path="/fly" element={<Fly/>}/>
                <Route path="/mission" element={<Mession/>}/>
                <Route path="/plan" element={<Plan/>}/>
                <Route path="/waypts" element={<Waypts/>}/>
                <Route path="/logs" element={<Logs/>}/>
            </Route>
        </Routes>
    )
}

export default Routing
