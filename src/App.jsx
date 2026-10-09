import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import PageHelp from "./components/PageHelp";
import Home from "./pages/Home";
import FillingQuestions from "./pages/FillingQuestions";
import Review from "./pages/Review";
import Stage1 from "./pages/Stage1";
import Stage2 from "./pages/Stage2";
import Stage3 from "./pages/Stage3";
import Stage5 from "./pages/Stage5";
import Stage6 from "./pages/Stage6";
import Stage7 from "./pages/Stage7";
import Stage8 from "./pages/Stage8";
import Stage9 from "./pages/Stage9";
import Stage10 from "./pages/Stage10";
import Stage11 from "./pages/Stage11";
import Stage12 from "./pages/Stage12";
import Stage14 from "./pages/Stage14";
import Stage15 from "./pages/Stage15";
import Stage16 from "./pages/Stage16";
import Stage17 from "./pages/Stage17";
import Stage18 from "./pages/Stage18";
import Stage19 from "./pages/Stage19";
import Stage20 from "./pages/Stage20";
import Stage21 from "./pages/Stage21";
import Stage22 from "./pages/Stage22";
import Stage23 from "./pages/Stage23";
import Stage28 from "./pages/Stage28";
import Stage29 from "./pages/Stage29";
import Stage30 from "./pages/Stage30";
import Stage31 from "./pages/Stage31";
import Add from "./pages/Add";

function Stage13Redirect() {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/stage22", search: location.search }} replace />
  );
}

function Stage2Redirect() {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/stage2", search: location.search }} replace />
  );
}

function Stage23BundleRedirect() {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/stage23", search: location.search }} replace />
  );
}

function App() {
  return (
    <BrowserRouter>
      <PageHelp />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/questions" element={<FillingQuestions />} />
        <Route path="/review" element={<Review />} />
        <Route path="/stage1" element={<Stage1 />} />
        <Route path="/stage2" element={<Stage2 />} />
        <Route path="/stage2_3" element={<Stage2Redirect />} />
        <Route path="/stage3" element={<Stage3 />} />
        <Route path="/stage4" element={<Stage2Redirect />} />
        <Route path="/stage5" element={<Stage5 />} />
        <Route path="/stage6" element={<Stage6 />} />
        <Route path="/stage7" element={<Stage7 />} />
        <Route path="/stage8" element={<Stage8 />} />
        <Route path="/stage9" element={<Stage9 />} />
        <Route path="/stage10" element={<Stage10 />} />
        <Route path="/stage11" element={<Stage11 />} />
        <Route path="/stage12" element={<Stage12 />} />
        <Route path="/stage13" element={<Stage13Redirect />} />
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
        <Route path="/stage24" element={<Stage23BundleRedirect />} />
        <Route path="/stage25" element={<Stage23BundleRedirect />} />
        <Route path="/stage26" element={<Stage23BundleRedirect />} />
        <Route path="/stage27" element={<Stage23BundleRedirect />} />
        <Route path="/stage28" element={<Stage28 />} />
        <Route path="/stage29" element={<Stage29 />} />
        <Route path="/stage30" element={<Stage30 />} />
        <Route path="/stage31" element={<Stage31 />} />
        <Route path="/add" element={<Add />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
