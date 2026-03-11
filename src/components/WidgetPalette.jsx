import { Type, Image, Layers, BarChart2, Award, Minus } from 'lucide-react';
import { WIDGET_TYPES } from './WidgetTypes';

const WIDGET_BUTTONS = [
  { type: WIDGET_TYPES.TEXT, icon: Type, label: 'Text' },
  { type: WIDGET_TYPES.IMAGE, icon: Image, label: 'Image' },
  { type: WIDGET_TYPES.NFT, icon: Layers, label: 'NFT' },
  { type: WIDGET_TYPES.STATISTIC, icon: BarChart2, label: 'Statistic' },
  { type: WIDGET_TYPES.BADGE, icon: Award, label: 'Badge' },
  { type: WIDGET_TYPES.DIVIDER, icon: Minus, label: 'Divider' },
];

export default function WidgetPalette({ onAddWidget }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-3">Add Widget</h3>
      <div className="flex flex-col gap-2">
        {WIDGET_BUTTONS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddWidget(type)}
            className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700/80 hover:border-indigo-600/50 text-gray-200 transition-colors text-left"
          >
            <Icon className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
