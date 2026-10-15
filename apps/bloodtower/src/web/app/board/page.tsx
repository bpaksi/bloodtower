import { StoryBoard } from "../../components/board/StoryBoard";
import { waitingStoryboard } from "../../lib/boardView";

export default function BoardPage() {
  return <StoryBoard state={waitingStoryboard()} />;
}
