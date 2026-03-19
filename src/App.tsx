import { useState } from "react";
import { CharacterCreate } from "@/pages/CharacterCreate";
import { GamePage } from "@/pages/GamePage";

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [characterClass, setCharacterClass] = useState("");

  const handleCreateCharacter = (name: string, classId: string) => {
    setCharacterName(name);
    setCharacterClass(classId);
    setGameStarted(true);
  };

  if (!gameStarted) {
    return <CharacterCreate onCreateCharacter={handleCreateCharacter} />;
  }

  return (
    <GamePage characterName={characterName} characterClass={characterClass} />
  );
}

export default App;
