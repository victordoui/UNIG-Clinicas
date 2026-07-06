-- Create missing user_role enum type that is causing the signup errors
CREATE TYPE public.user_role AS ENUM ('admin', 'gerente', 'usuario');

-- Also create product_category enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
        CREATE TYPE public.product_category AS ENUM (
            'alimentos',
            'bebidas', 
            'limpeza',
            'higiene',
            'eletronicos',
            'vestuario',
            'casa_jardim',
            'esportes',
            'livros_midias',
            'ferramentas',
            'saude_beleza',
            'automotivo',
            'pet_shop',
            'brinquedos',
            'outros'
        );
    END IF;
END $$;

-- Also create movement_type enum if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE public.movement_type AS ENUM ('entrada', 'saida', 'transferencia', 'ajuste');
    END IF;
END $$;