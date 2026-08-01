import { Sparkles } from "lucide-react";
import Loader from "../../common/Loader";

export default function TrainButton({ onTrain, training }) {
  return (
    <button
      onClick={onTrain}
      disabled={training}
      className="flex items-center gap-2 px-4 h-10 bg-[#002366] text-white rounded-xl text-sm
                 font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150
                 shadow-md shadow-[#002366]/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {training ? <Loader /> : <Sparkles className="w-4 h-4" />}
      {training ? "Training..." : "Train Models"}
    </button>
  );
}