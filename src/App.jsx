import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Review from './pages/Review'
import Stage1 from './pages/Stage1'
import Stage2 from './pages/Stage2'
import Stage2_3 from './pages/Stage2_3'
import Stage3 from './pages/Stage3'
import Stage4 from './pages/Stage4'
import Stage5 from './pages/Stage5'
import Stage6 from './pages/Stage6'
import Stage7 from './pages/Stage7'
import Stage8 from './pages/Stage8'
import Stage9 from './pages/Stage9'
import Stage10 from './pages/Stage10'
import Stage11 from './pages/Stage11'
import Stage12 from './pages/Stage12'
import Stage13 from './pages/Stage13'
import Stage14 from './pages/Stage14'
import Stage15 from './pages/Stage15'
import Stage16 from './pages/Stage16'
import Stage17 from './pages/Stage17'
import Stage18 from './pages/Stage18'
import Stage19 from './pages/Stage19'
import Stage20 from './pages/Stage20'
import Stage21 from './pages/Stage21'
import Stage22 from './pages/Stage22'
import Stage23 from './pages/Stage23'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/stage1" element={<Stage1 />} />
        <Route path="/stage2" element={<Stage2 />} />
        <Route path="/stage2_3" element={<Stage2_3 />} />
        <Route path="/stage3" element={<Stage3 />} />
        <Route path="/stage4" element={<Stage4 />} />
        <Route path="/stage5" element={<Stage5 />} />
        <Route path="/stage6" element={<Stage6 />} />
        <Route path="/stage7" element={<Stage7 />} />
        <Route path="/stage8" element={<Stage8 />} />
        <Route path="/stage9" element={<Stage9 />} />
        <Route path="/stage10" element={<Stage10 />} />
        <Route path="/stage11" element={<Stage11 />} />
        <Route path="/stage12" element={<Stage12 />} />
        <Route path="/stage13" element={<Stage13 />} />
        <Route path="/stage14" element={<Stage14 />} />
        <Route path="/stage15" element={<Stage15 />} />
        <Route path="/stage16" element={<Stage16 />} />
        <Route path="/stage17" element={<Stage17 />} />
        <Route path="/stage18" element={<Stage18 />} />
        <Route path="/stage19" element={<Stage19 />} />
        <Route path="/stage20" element={<Stage20 />} />
        <Route path="/stage21" element={<Stage21 />} />
        <Route path="/stage22" element={<Stage22 />} />
        <Route path="/stage23" element={<Stage23 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
