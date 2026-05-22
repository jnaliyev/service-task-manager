type Props = {
    children: React.ReactNode;
  };
  
  export default function TaskForm({ children }: Props) {
    return (
      <div>
        {children}
      </div>
    );
  }