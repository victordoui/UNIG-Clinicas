-- Adicionar foreign key para relacionar movements com profiles
ALTER TABLE movements
ADD CONSTRAINT movements_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;