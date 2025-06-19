import {
  Edit2,
  ArrowUp,
  ArrowDown,
  Eraser,
  BellOff,
  Plus,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TargetInfo } from '@/types';

interface ServiceDropdownMenuProps {
  service: TargetInfo & { subscribed?: boolean };
  index: number;
  totalServices: number;
  onEdit: (service: TargetInfo) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onClear: (url: string) => void;
  onSubscribe: (id: number) => void;
  onUnsubscribe: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ServiceDropdownMenu({
  service,
  index,
  totalServices,
  onEdit,
  onMoveUp,
  onMoveDown,
  onClear,
  onSubscribe,
  onUnsubscribe,
  onDelete,
}: ServiceDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onEdit(service)}>
          <Edit2 className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onMoveUp(service.id)}
          disabled={index === 0}
        >
          <ArrowUp className="mr-2 h-4 w-4" />
          <span>Move up</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onMoveDown(service.id)}
          disabled={index === totalServices - 1}
        >
          <ArrowDown className="mr-2 h-4 w-4" />
          <span>Move down</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onClear(service.url)}>
          <Eraser className="mr-2 h-4 w-4" />
          <span>Clear</span>
        </DropdownMenuItem>
        {service.subscribed ? (
          <DropdownMenuItem onClick={() => onUnsubscribe(service.id)}>
            <BellOff className="mr-2 h-4 w-4" />
            <span>Unsubscribe</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onSubscribe(service.id)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Subscribe</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDelete(service.id)}>
          <Trash2 className="mr-2 h-4 w-4 text-red-600" />
          <span className="text-red-600">Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
