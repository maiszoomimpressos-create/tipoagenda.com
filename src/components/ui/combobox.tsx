"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onCreateNew?: (newValue: string) => void; // Nova prop para criação
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção",
  searchPlaceholder = "Buscar opção...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  onCreateNew,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("") // Para capturar o texto digitado

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateNew = inputValue.length > 0 && filteredOptions.length === 0 && onCreateNew;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}> {/* Desativar filtro padrão do Command */}
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={setInputValue}
            value={inputValue}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for searchability
                  onSelect={() => {
                    onValueChange(option.value)
                    setInputValue(option.label) // Define o input para o label da opção selecionada
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {showCreateNew && (
                <CommandItem
                  key="create-new"
                  value={inputValue} // Permite pesquisar por este item
                  onSelect={() => {
                    onCreateNew?.(inputValue) // Chama a função para criar novo
                    setInputValue("") // Limpa o input após a criação
                    setOpen(false)
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar nova funcionalidade: "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

