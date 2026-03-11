import { Type, Image, Award, Minus } from 'lucide-react';
import { WIDGET_TYPES } from './WidgetTypes';

const WIDGET_BUTTONS = [
  { type: WIDGET_TYPES.TEXT, icon: Type, label: 'Text', hint: 'Add a text block' },
  { type: WIDGET_TYPES.IMAGE, icon: Image, label: 'Image', hint: 'Add an image' },
  { type: WIDGET_TYPES.BADGE, icon: Award, label: 'Badge', hint: 'Add a badge pill' },
  { type: WIDGET_TYPES.DIVIDER, icon: Minus, label: 'Divider', hint: 'Add a horizontal line' },
];

export default function WidgetPalette({ onAddWidget }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-3">Add Widget</h3>
      <div className="grid grid-cols-2 gap-2">
        {WIDGET_BUTTONS.map(({ type, icon: Icon, label, hint }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddWidget(type)}
            className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700/80 hover:border-indigo-600/50 text-gray-200 transition-colors"
          >
            <Icon className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-gray-500">{hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
