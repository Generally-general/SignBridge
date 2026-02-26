import { BrowserRouter, Routes, Route } from "react-router-dom";
import VideoCall from "./pages/VideoCall";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Home Page</h1>} />
        <Route path="/video" element={<VideoCall />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;