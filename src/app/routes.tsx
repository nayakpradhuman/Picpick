import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { ReviewAlbum } from "./pages/ReviewAlbum";
import { Results } from "./pages/Results";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/album/:id",
    Component: ReviewAlbum,
  },
  {
    path: "/album/:id/results",
    Component: Results,
  },
]);
