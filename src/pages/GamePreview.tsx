import PromptGame from "@/components/PromptGame";

export default function GamePreview() {
  const dateKey = new Date().toISOString().split("T")[0];

  // Clear game state so it always shows
  localStorage.removeItem(`items-game-${dateKey}`);

  return (
    <PromptGame
      prompt="Something soft"
      dailyItemId="e6984001-587b-42f1-a0d0-1bad9459e8bc"
      dateKey={dateKey}
      onComplete={(wrong) => {
        console.log("Game complete, wrong guesses:", wrong);
        alert(`Game done! Wrong guesses: ${wrong}`);
      }}
    />
  );
}
