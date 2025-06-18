import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TargetInfo } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: TargetInfo) => void;
  existingTarget: TargetInfo | null;
}

const credentialRequiringTypes = ['postgres', 'redis'];

export function AddOrEditServiceDialog({
  isOpen,
  onClose,
  onSave,
  existingTarget,
}: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'http' | 'postgres' | 'redis'>('http');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isEditMode = !!existingTarget;

  useEffect(() => {
    if (isEditMode) {
      setName(existingTarget.name);
      setUrl(existingTarget.url);
      setType(existingTarget.type);
      setUsername(existingTarget.username || '');
      setPassword(''); // Always clear password for security
    } else {
      // Reset form for adding
      setName('');
      setUrl('');
      setType('http');
      setUsername('');
      setPassword('');
    }
  }, [existingTarget, isEditMode]);

  const handleSave = () => {
    let normalizedUrl = url;
    if (
      type === 'http' &&
      !normalizedUrl.startsWith('http://') &&
      !normalizedUrl.startsWith('https://')
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    onSave({
      id: existingTarget?.id || 0,
      name,
      url: normalizedUrl,
      type,
      username,
      password,
    });
  };

  const showCredentials = credentialRequiringTypes.includes(type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="md:text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="md:col-span-3"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="md:text-right">
              Type
            </Label>
            <Select
              id="type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'http' | 'postgres' | 'redis')
              }
              className="md:col-span-3"
            >
              <option value="http">HTTP</option>
              <option value="postgres">Postgres</option>
              <option value="redis">Redis</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="md:text-right">
              URL
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="md:col-span-3"
            />
          </div>
          {showCredentials && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="md:text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="md:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="md:text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="md:col-span-3"
                  placeholder={
                    isEditMode ? 'Leave blank to keep unchanged' : ''
                  }
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
