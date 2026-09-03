export function ChoiceGrid({
  name,
  choices,
  selected = [],
}: {
  name: string;
  choices: readonly string[];
  selected?: readonly string[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {choices.map((choice) => (
        <label key={choice} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-paper px-3 py-3 text-sm transition has-[:checked]:border-wine has-[:checked]:bg-wine/5">
          <input type="checkbox" name={name} value={choice} defaultChecked={selected.includes(choice)} className="size-4 accent-wine" />
          <span>{choice}</span>
        </label>
      ))}
    </div>
  );
}
